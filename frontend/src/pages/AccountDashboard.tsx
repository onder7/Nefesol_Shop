import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Heart,
  Zap,
  MessageCircle,
  Star,
  Gift,
  User,
  LogOut,
  ChevronRight,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';

export function AccountDashboard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');

  function handleLogout() {
    logout();
    toast.success('Çıkış yapıldı');
    navigate('/');
  }

  // Get user initials
  const initials = user?.email
    ?.split('@')[0]
    .split('')
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  const menuItems = [
    {
      id: 'overview',
      icon: User,
      label: 'Hesap Özeti',
      badge: null,
    },
    {
      id: 'orders',
      icon: ShoppingBag,
      label: 'Siparişlerim',
      badge: '3',
    },
    {
      id: 'favorites',
      icon: Heart,
      label: 'Beğendiklerim',
      badge: '12',
    },
    {
      id: 'reviews',
      icon: Star,
      label: 'Değerlendirmelerim',
      badge: '5',
    },
    {
      id: 'coupons',
      icon: Gift,
      label: 'Kuponlarım',
      badge: '2',
    },
    {
      id: 'messages',
      icon: MessageCircle,
      label: 'Mesajlarım',
      badge: '1',
    },
    {
      id: 'profile',
      icon: User,
      label: 'Profil Bilgileri',
      badge: null,
    },
  ];

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          {/* Profile Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 dark:bg-gray-900 dark:border-gray-700">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold">
                {initials}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {user?.email?.split('@')[0]}
                </p>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
            </div>
            <Link
              to="/hesabim/profil"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              Profili Düzenle <ChevronRight size={16} />
            </Link>
          </div>

          {/* Menu Items */}
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeSection === item.id
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon size={18} />
                  <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                  {item.badge && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 mt-6 transition-colors"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Çıkış Yap</span>
          </button>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {activeSection === 'overview' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Hoş geldin, {user?.email?.split('@')[0]}!
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Hesap özeti ve etkinliklerini burada yönetebilirsin.
                </p>
              </div>

              {/* Stats Cards */}
              <div className="grid md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg border border-gray-200 p-6 dark:bg-gray-900 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Toplam Sipariş</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">12</p>
                    </div>
                    <ShoppingBag size={32} className="text-primary opacity-20" />
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6 dark:bg-gray-900 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Beğendiler</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">48</p>
                    </div>
                    <Heart size={32} className="text-red-500 opacity-20" />
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6 dark:bg-gray-900 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Kuponlarım</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">5</p>
                    </div>
                    <Gift size={32} className="text-purple-500 opacity-20" />
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6 dark:bg-gray-900 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Puanlarım</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">450</p>
                    </div>
                    <Zap size={32} className="text-yellow-500 opacity-20" />
                  </div>
                </div>
              </div>

              {/* Recent Orders */}
              <div className="bg-white rounded-lg border border-gray-200 dark:bg-gray-900 dark:border-gray-700">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Son Siparişler
                  </h2>
                </div>

                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {[
                    {
                      id: '1',
                      date: '15 Haziran 2026',
                      items: '3 Ürün',
                      total: '450 TL',
                      status: 'delivered',
                    },
                    {
                      id: '2',
                      date: '10 Haziran 2026',
                      items: '2 Ürün',
                      total: '280 TL',
                      status: 'delivered',
                    },
                    {
                      id: '3',
                      date: '5 Haziran 2026',
                      items: '1 Ürün',
                      total: '120 TL',
                      status: 'processing',
                    },
                  ].map((order) => (
                    <div key={order.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            Sipariş #{order.id}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {order.date} • {order.items}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {order.total}
                            </p>
                            {order.status === 'delivered' ? (
                              <div className="flex items-center gap-1 text-green-600 text-sm">
                                <CheckCircle size={14} />
                                Teslim Edildi
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-blue-600 text-sm">
                                <Clock size={14} />
                                Kargoda
                              </div>
                            )}
                          </div>
                          <ChevronRight size={20} className="text-gray-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <Link
                    to="/hesabim/siparisler"
                    className="text-primary hover:underline text-sm font-medium"
                  >
                    Tüm Siparişleri Gör →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'orders' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 dark:bg-gray-900 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Siparişlerim
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Tüm siparişleriniz burada görüntülenebilir.
              </p>
            </div>
          )}

          {activeSection === 'favorites' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 dark:bg-gray-900 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Beğendiklerim
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Beğendiğin ürünler burada görüntülenebilir.
              </p>
            </div>
          )}

          {activeSection === 'reviews' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 dark:bg-gray-900 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Değerlendirmelerim
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Yaptığın değerlendirmeler burada görüntülenebilir.
              </p>
            </div>
          )}

          {activeSection === 'coupons' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 dark:bg-gray-900 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Kuponlarım
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Mevcut kuponların burada görüntülenebilir.
              </p>
            </div>
          )}

          {activeSection === 'messages' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 dark:bg-gray-900 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Mesajlarım
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Gelen mesajların burada görüntülenebilir.
              </p>
            </div>
          )}

          {activeSection === 'profile' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 dark:bg-gray-900 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Profil Bilgileri
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Profil bilgilerini düzenlemek için /hesabim/profil adresine git.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
