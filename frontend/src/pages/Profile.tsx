import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Lock, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/services/authApi';
import { api } from '@/services/api';
import { toast } from 'sonner';
import type { User as UserType } from '@/types';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  firstName: z.string().min(2, 'Ad en az 2 karakter').max(50),
  lastName: z.string().min(2, 'Soyad en az 2 karakter').max(50),
  phone: z.string().max(15).optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mevcut şifre zorunlu'),
    newPassword: z
      .string()
      .min(8, 'En az 8 karakter')
      .regex(/[A-Z]/, 'En az bir büyük harf')
      .regex(/[0-9]/, 'En az bir rakam'),
    confirmPassword: z.string().min(1),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Şifreler eşleşmiyor',
    path: ['confirmPassword'],
  });

type ProfileValues = z.infer<typeof profileSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

// ─── Profile Form ─────────────────────────────────────────────────────────────

function ProfileForm({ user, onSaved }: { user: UserType; onSaved: (u: UserType) => void }) {
  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user.profile?.firstName ?? '',
      lastName: user.profile?.lastName ?? '',
      phone: user.profile?.phone ?? '',
    },
  });

  const [saving, setSaving] = useState(false);

  async function onSubmit(data: ProfileValues) {
    setSaving(true);
    try {
      const res = await api.put<{ success: boolean; data: UserType }>('/auth/profile', data);
      onSaved(res.data.data);
      toast.success('Profil güncellendi');
    } catch {
      toast.error('Profil güncellenemedi');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">Ad</Label>
          <Input id="firstName" className="mt-1" {...register('firstName')} />
          {errors.firstName && <p className="text-xs text-destructive mt-1">{errors.firstName.message}</p>}
        </div>
        <div>
          <Label htmlFor="lastName">Soyad</Label>
          <Input id="lastName" className="mt-1" {...register('lastName')} />
          {errors.lastName && <p className="text-xs text-destructive mt-1">{errors.lastName.message}</p>}
        </div>
      </div>
      <div>
        <Label htmlFor="phone">Telefon</Label>
        <Input id="phone" placeholder="05XX XXX XX XX" className="mt-1" {...register('phone')} />
      </div>
      <div>
        <Label>E-posta</Label>
        <Input value={user.email} disabled className="mt-1 bg-muted" />
        <p className="text-xs text-muted-foreground mt-1">E-posta değiştirilemez.</p>
      </div>
      <Button type="submit" disabled={!isDirty || saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
        Kaydet
      </Button>
    </form>
  );
}

// ─── Password Form ────────────────────────────────────────────────────────────

function PasswordForm() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
  });
  const [saving, setSaving] = useState(false);

  async function onSubmit(data: PasswordValues) {
    setSaving(true);
    try {
      await authApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success('Şifre değiştirildi');
      reset();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Şifre değiştirilemedi';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const field = (id: keyof PasswordValues, label: string, placeholder = '') => (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="password" placeholder={placeholder} className="mt-1" {...register(id)} />
      {errors[id] && <p className="text-xs text-destructive mt-1">{errors[id]?.message}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {field('currentPassword', 'Mevcut Şifre', '••••••••')}
      {field('newPassword', 'Yeni Şifre', '••••••••')}
      {field('confirmPassword', 'Yeni Şifre (Tekrar)', '••••••••')}
      <Button type="submit" disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
        Şifreyi Değiştir
      </Button>
    </form>
  );
}

// ─── Profile Page ─────────────────────────────────────────────────────────────

export function Profile() {
  const { user, setUser, accessToken } = useAuthStore();

  if (!user) return null;

  return (
    <main className="container mx-auto px-4 py-8 max-w-xl">
      <h1 className="text-2xl font-bold mb-8 flex items-center gap-2">
        <User className="h-6 w-6" />
        Profilim
      </h1>

      <div className="space-y-8">
        {/* Profile info */}
        <section className="border rounded-lg p-6">
          <h2 className="font-semibold text-lg mb-4">Kişisel Bilgiler</h2>
          <ProfileForm
            user={user}
            onSaved={(updated) => setUser(updated, accessToken ?? '')}
          />
        </section>

        {/* Password */}
        <section className="border rounded-lg p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Şifre Değiştir
          </h2>
          <PasswordForm />
        </section>
      </div>
    </main>
  );
}
