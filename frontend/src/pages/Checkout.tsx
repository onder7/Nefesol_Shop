import { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapPin, Plus, ChevronRight, ShoppingBag, CreditCard, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { checkoutApi } from '@/services/checkoutApi';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import type { Address, CheckoutInitResponse } from '@/types';
import { toast } from 'sonner';

type InitData = CheckoutInitResponse;

// ─── Validation ───────────────────────────────────────────────────────────────

const addressSchema = z.object({
  title: z.string().min(1, 'Adres başlığı zorunlu').max(50),
  firstName: z.string().min(2, 'Ad en az 2 karakter').max(50),
  lastName: z.string().min(2, 'Soyad en az 2 karakter').max(50),
  phone: z.string().min(10, 'Geçerli telefon numarası girin').max(15),
  city: z.string().min(2, 'Şehir zorunlu').max(50),
  district: z.string().min(2, 'İlçe zorunlu').max(50),
  postalCode: z.string().max(10).optional(),
  address: z.string().min(10, 'Adres en az 10 karakter olmalı').max(250),
});

type AddressFormValues = z.infer<typeof addressSchema>;

// ─── Utils ────────────────────────────────────────────────────────────────────

function formatPrice(n: number) {
  return n.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
}

// ─── Step indicators ──────────────────────────────────────────────────────────

const STEPS = ['Adres', 'Özet', 'Ödeme'];

function StepBar({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => (
        <li key={label} className="flex items-center flex-1 last:flex-none">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold border-2 transition-colors
              ${i < current ? 'bg-primary border-primary text-white' : ''}
              ${i === current ? 'border-primary text-primary' : ''}
              ${i > current ? 'border-muted-foreground text-muted-foreground' : ''}`}
          >
            {i < current ? <Check className="h-4 w-4" /> : i + 1}
          </div>
          <span className={`ml-2 text-sm font-medium ${i === current ? 'text-primary' : 'text-muted-foreground'}`}>
            {label}
          </span>
          {i < STEPS.length - 1 && <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground flex-shrink-0" />}
        </li>
      ))}
    </ol>
  );
}

// ─── Address form ─────────────────────────────────────────────────────────────

function AddressForm({ onSaved }: { onSaved: (addr: Address) => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
  });

  const mut = useMutation({
    mutationFn: (data: AddressFormValues) =>
      checkoutApi.createAddress({ ...data, type: 'SHIPPING', isDefault: true }),
    onSuccess: (res) => onSaved(res.data.data),
    onError: () => toast.error('Adres kaydedilemedi'),
  });

  const field = (id: keyof AddressFormValues, label: string, placeholder = '', fullWidth = false) => (
    <div className={fullWidth ? 'sm:col-span-2' : ''}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        placeholder={placeholder}
        className="mt-1"
        {...register(id)}
      />
      {errors[id] && <p className="text-xs text-destructive mt-1">{errors[id]?.message}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit((d) => mut.mutate(d))} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        {field('title', 'Adres Başlığı', 'Ev, İş...')}
        {field('phone', 'Telefon', '05XX XXX XX XX')}
        {field('firstName', 'Ad')}
        {field('lastName', 'Soyad')}
        {field('city', 'Şehir', 'İstanbul')}
        {field('district', 'İlçe', 'Kadıköy')}
        {field('postalCode', 'Posta Kodu (opsiyonel)', '34XXX')}
        <div></div>
        {field('address', 'Adres', 'Cadde, sokak, bina no, daire...', true)}
      </div>
      <Button type="submit" disabled={mut.isPending} className="w-full sm:w-auto">
        {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
        Adresi Kaydet
      </Button>
    </form>
  );
}

// ─── Main Checkout ─────────────────────────────────────────────────────────────

export function Checkout() {
  const { isAuthenticated } = useAuthStore();
  const { cart } = useCartStore();
  const [step, setStep] = useState(0);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [initData, setInitData] = useState<InitData | null>(null);
  const paymentDivRef = useRef<HTMLDivElement>(null);

  // Redirect if not logged in
  if (!isAuthenticated) return <Navigate to="/giris" state={{ from: '/odeme' }} replace />;

  // Redirect if cart empty
  if (!cart || cart.items.length === 0) return <Navigate to="/sepet" replace />;

  const { data: addrData, isLoading: addrLoading, refetch: refetchAddr } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => (await checkoutApi.listAddresses()).data.data,
  });

  const addresses = addrData ?? [];

  // Auto-select default address
  useEffect(() => {
    if (!selectedAddress && addresses.length > 0) {
      setSelectedAddress(addresses.find((a) => a.isDefault) ?? addresses[0]);
    }
  }, [addresses]);

  const initMut = useMutation({
    mutationFn: (addressId: string) => checkoutApi.initialize(addressId),
    onSuccess: (res) => {
      setInitData(res.data.data as InitData);
      setStep(2);
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message ?? 'Ödeme başlatılamadı'),
  });

  // Inject Iyzico form HTML after initData is set
  useEffect(() => {
    if (initData?.checkoutFormContent && paymentDivRef.current) {
      paymentDivRef.current.innerHTML = initData.checkoutFormContent;
      // Execute any embedded scripts
      const scripts = paymentDivRef.current.querySelectorAll('script');
      scripts.forEach((oldScript) => {
        const newScript = document.createElement('script');
        newScript.textContent = oldScript.textContent;
        oldScript.replaceWith(newScript);
      });
    }
  }, [initData, step]);

  const subtotal = cart.items.reduce((s, i) => s + i.priceAtAdd * i.quantity, 0);
  const shippingFee = initData?.shippingFee ?? (subtotal >= 500 ? 0 : 49.9);
  const total = initData?.total ?? subtotal + shippingFee;

  // ─── Step 0: Address ────────────────────────────────────────────────────────

  const stepAddress = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <MapPin className="h-5 w-5 text-primary" />
        Teslimat Adresi
      </h2>

      {addrLoading ? (
        <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}</div>
      ) : (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <button
              key={addr.id}
              onClick={() => { setSelectedAddress(addr); setShowNewForm(false); }}
              className={`w-full text-left border rounded-lg p-4 transition-colors ${
                selectedAddress?.id === addr.id
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-muted-foreground'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{addr.title}</span>
                {addr.isDefault && <Badge variant="secondary">Varsayılan</Badge>}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {addr.firstName} {addr.lastName} — {addr.phone}
              </p>
              <p className="text-sm text-muted-foreground">
                {addr.address}, {addr.district} / {addr.city}
              </p>
            </button>
          ))}
        </div>
      )}

      {!showNewForm && (
        <Button variant="outline" size="sm" onClick={() => setShowNewForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Yeni Adres Ekle
        </Button>
      )}

      {showNewForm && (
        <div className="border rounded-lg p-4 space-y-4">
          <h3 className="font-medium">Yeni Adres</h3>
          <AddressForm
            onSaved={(addr) => {
              setSelectedAddress(addr);
              setShowNewForm(false);
              refetchAddr();
            }}
          />
        </div>
      )}

      <Button
        className="w-full"
        disabled={!selectedAddress}
        onClick={() => setStep(1)}
      >
        Devam Et
        <ChevronRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );

  // ─── Step 1: Summary ────────────────────────────────────────────────────────

  const stepSummary = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <ShoppingBag className="h-5 w-5 text-primary" />
        Sipariş Özeti
      </h2>

      <div className="border rounded-lg divide-y">
        {cart.items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 p-3">
            <div className="w-12 h-12 rounded bg-gray-50 flex-shrink-0 overflow-hidden">
              {item.variant.product.images?.[0] ? (
                <img
                  src={item.variant.product.images[0].url}
                  alt={item.variant.product.name}
                  className="w-full h-full object-cover"
                />
              ) : <div className="w-full h-full bg-gray-100" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm line-clamp-1">{item.variant.product.name}</p>
              <p className="text-xs text-muted-foreground">x{item.quantity}</p>
            </div>
            <p className="text-sm font-medium">{formatPrice(item.priceAtAdd * item.quantity)}</p>
          </div>
        ))}
      </div>

      {selectedAddress && (
        <div className="border rounded-lg p-4">
          <p className="text-sm font-medium mb-1">Teslimat Adresi</p>
          <p className="text-sm text-muted-foreground">
            {selectedAddress.firstName} {selectedAddress.lastName}, {selectedAddress.address},{' '}
            {selectedAddress.district} / {selectedAddress.city}
          </p>
        </div>
      )}

      <div className="border rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span>Ara Toplam</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Kargo</span>
          <span>{shippingFee === 0 ? 'Ücretsiz' : formatPrice(shippingFee)}</span>
        </div>
        <div className="flex justify-between font-semibold border-t pt-2">
          <span>Toplam</span>
          <span>{formatPrice(total)}</span>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setStep(0)} className="flex-1">Geri</Button>
        <Button
          className="flex-1"
          disabled={initMut.isPending}
          onClick={() => selectedAddress && initMut.mutate(selectedAddress.id)}
        >
          {initMut.isPending
            ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Yükleniyor...</>
            : <><CreditCard className="h-4 w-4 mr-2" />Ödemeye Geç</>}
        </Button>
      </div>
    </div>
  );

  // ─── Step 2: Payment ────────────────────────────────────────────────────────

  const stepPayment = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-primary" />
        Ödeme
      </h2>

      {initData && (
        <div className="border rounded-lg p-4 text-sm text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Toplam Tutar</span>
            <span className="font-semibold text-foreground">{formatPrice(initData.total)}</span>
          </div>
        </div>
      )}

      <div ref={paymentDivRef} className="min-h-[200px]" />

      <Button variant="outline" onClick={() => setStep(1)} className="w-full">
        ← Özete Dön
      </Button>
    </div>
  );

  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Ödeme</h1>
      <StepBar current={step} />

      {step === 0 && stepAddress()}
      {step === 1 && stepSummary()}
      {step === 2 && stepPayment()}
    </main>
  );
}
