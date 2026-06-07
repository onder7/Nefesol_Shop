import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (arg: boolean) => void;
}

const navItems = [
  {
    to: '/',
    label: 'Dashboard',
    exact: true,
    icon: (
      <svg className="fill-current" width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M6.10322 0.956299H2.53135C1.5751 0.956299 0.787598 1.7438 0.787598 2.70005V6.27192C0.787598 7.22817 1.5751 8.01567 2.53135 8.01567H6.10322C7.05947 8.01567 7.84697 7.22817 7.84697 6.27192V2.72817C7.8751 1.7438 7.0876 0.956299 6.10322 0.956299ZM6.60947 6.30005C6.60947 6.5813 6.38447 6.8063 6.10322 6.8063H2.53135C2.2501 6.8063 2.0251 6.5813 2.0251 6.30005V2.72817C2.0251 2.44692 2.2501 2.22192 2.53135 2.22192H6.10322C6.38447 2.22192 6.60947 2.44692 6.60947 2.72817V6.30005ZM15.4689 0.956299H11.8971C10.9408 0.956299 10.1533 1.7438 10.1533 2.70005V6.27192C10.1533 7.22817 10.9408 8.01567 11.8971 8.01567H15.4689C16.4252 8.01567 17.2127 7.22817 17.2127 6.27192V2.72817C17.2127 1.7438 16.4252 0.956299 15.4689 0.956299ZM15.9752 6.30005C15.9752 6.5813 15.7502 6.8063 15.4689 6.8063H11.8971C11.6158 6.8063 11.3908 6.5813 11.3908 6.30005V2.72817C11.3908 2.44692 11.6158 2.22192 11.8971 2.22192H15.4689C15.7502 2.22192 15.9752 2.44692 15.9752 2.72817V6.30005ZM6.10322 9.92822H2.53135C1.5751 9.92822 0.787598 10.7157 0.787598 11.672V15.2438C0.787598 16.2001 1.5751 16.9876 2.53135 16.9876H6.10322C7.05947 16.9876 7.84697 16.2001 7.84697 15.2438V11.7001C7.8751 10.7157 7.0876 9.92822 6.10322 9.92822ZM6.60947 15.272C6.60947 15.5532 6.38447 15.7782 6.10322 15.7782H2.53135C2.2501 15.7782 2.0251 15.5532 2.0251 15.272V11.7001C2.0251 11.4188 2.2501 11.1938 2.53135 11.1938H6.10322C6.38447 11.1938 6.60947 11.4188 6.60947 11.7001V15.272ZM15.4689 9.92822H11.8971C10.9408 9.92822 10.1533 10.7157 10.1533 11.672V15.2438C10.1533 16.2001 10.9408 16.9876 11.8971 16.9876H15.4689C16.4252 16.9876 17.2127 16.2001 17.2127 15.2438V11.7001C17.2127 10.7157 16.4252 9.92822 15.4689 9.92822ZM15.9752 15.272C15.9752 15.5532 15.7502 15.7782 15.4689 15.7782H11.8971C11.6158 15.7782 11.3908 15.5532 11.3908 15.272V11.7001C11.3908 11.4188 11.6158 11.1938 11.8971 11.1938H15.4689C15.7502 11.1938 15.9752 11.4188 15.9752 11.7001V15.272Z" fill="" />
      </svg>
    ),
  },
  {
    to: '/products',
    label: 'Ürünler',
    icon: (
      <svg className="fill-current" width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    to: '/orders',
    label: 'Siparişler',
    icon: (
      <svg className="fill-current" width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M6 2v6l2-2 2 2V2h4v6l2-2 2 2V2h2v20H4V2h2zm0 9v9h12v-9H6zm2 2h8v2H8v-2zm0 3h5v2H8v-2z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    to: '/customers',
    label: 'Müşteriler',
    icon: (
      <svg className="fill-current" width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    to: '/categories',
    label: 'Kategoriler',
    icon: (
      <svg className="fill-current" width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M10 3H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1zm10 0h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1zM10 13H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1zm7 1a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    to: '/brands',
    label: 'Markalar',
    icon: (
      <svg className="fill-current" width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L2 7l10 5 10-5-10-5zm0 12.54L2 9.54v6L12 21l10-5.46v-6L12 14.54z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    to: '/attributes',
    label: 'Ürün Özellikleri',
    icon: (
      <svg className="fill-current" width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M3 5h2V3H3v2zm0 8h2v-2H3v2zm0 8h2v-2H3v2zm4-16v2h14V5H7zm0 10h14v-2H7v2zm0 8h14v-2H7v2z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    to: '/campaigns',
    label: 'Kampanyalar',
    icon: (
      <svg className="fill-current" width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    to: '/discounts',
    label: 'İndirimler',
    icon: (
      <svg className="fill-current" width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    to: '/cancellations',
    label: 'İptal & İade',
    icon: (
      <svg className="fill-current" width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    to: '/analytics',
    label: 'Raporlar',
    icon: (
      <svg className="fill-current" width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    to: '/user-analytics',
    label: 'Kullanıcı İstatistikleri',
    icon: (
      <svg className="fill-current" width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z" fill="currentColor"/>
      </svg>
    ),
  },
  {
    to: '/settings',
    label: 'Ayarlar',
    exact: true,
    icon: (
      <svg className="fill-current" width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" fill="currentColor"/>
      </svg>
    ),
  },
];

const Sidebar = ({ sidebarOpen, setSidebarOpen }: SidebarProps) => {
  const navigate = useNavigate();
  const { user, logout } = useAdminAuth();
  const trigger = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);

  const [sidebarExpanded] = useState(
    localStorage.getItem('sidebar-expanded') !== 'false'
  );

  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!sidebar.current || !trigger.current) return;
      if (!sidebarOpen || sidebar.current.contains(target as Node) || trigger.current.contains(target as Node)) return;
      setSidebarOpen(false);
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  });

  useEffect(() => {
    const keyHandler = ({ key }: KeyboardEvent) => {
      if (!sidebarOpen || key !== 'Escape') return;
      setSidebarOpen(false);
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  });

  useEffect(() => {
    localStorage.setItem('sidebar-expanded', sidebarExpanded.toString());
    document.querySelector('body')?.classList.toggle('sidebar-expanded', sidebarExpanded);
  }, [sidebarExpanded]);

  function handleLogout() {
    logout();
    navigate('/auth/signin');
  }

  return (
    <aside
      ref={sidebar}
      className={`absolute left-0 top-0 z-9999 flex h-screen w-72.5 flex-col overflow-y-hidden bg-black duration-300 ease-linear dark:bg-boxdark lg:static lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-6 py-5.5 lg:py-6.5">
        <NavLink to="/" className="text-white text-xl font-bold tracking-tight">
          MaBridge <span className="text-primary text-sm font-medium">Admin</span>
        </NavLink>
        <button
          ref={trigger}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="block lg:hidden text-white"
        >
          <svg className="fill-current" width="20" height="18" viewBox="0 0 20 18" fill="none">
            <path d="M19 8.175H2.98748L9.36248 1.6875C9.69998 1.35 9.69998 0.825 9.36248 0.4875C9.02498 0.15 8.49998 0.15 8.16248 0.4875L0.399976 8.3625C0.0624756 8.7 0.0624756 9.225 0.399976 9.5625L8.16248 17.4375C8.31248 17.5875 8.53748 17.7 8.76248 17.7C8.98748 17.7 9.17498 17.625 9.36248 17.475C9.69998 17.1375 9.69998 16.6125 9.36248 16.275L3.02498 9.8625H19C19.45 9.8625 19.825 9.4875 19.825 9.0375C19.825 8.55 19.45 8.175 19 8.175Z" fill="" />
          </svg>
        </button>
      </div>

      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear flex-1">
        <nav className="mt-5 py-4 px-4 lg:mt-9 lg:px-6 flex flex-col h-full">
          <div>
            <h3 className="mb-4 ml-4 text-sm font-semibold text-bodydark2">MENÜ</h3>
            <ul className="mb-6 flex flex-col gap-1.5">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.exact}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4 ${
                        isActive ? 'bg-graydark dark:bg-meta-4' : ''
                      }`
                    }
                  >
                    {item.icon}
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Alt kısım: kullanıcı + çıkış */}
          <div className="mt-auto border-t border-stroke border-opacity-10 pt-4">
            <div className="px-4 py-2 text-sm text-bodydark2 truncate">
              {user?.profile?.firstName ?? user?.email}
            </div>
            <button
              onClick={handleLogout}
              className="group w-full flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4"
            >
              <svg className="fill-current" width="18" height="18" viewBox="0 0 24 24">
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" fill="currentColor"/>
              </svg>
              Çıkış Yap
            </button>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
