'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import { BUSINESS_LOGO } from '@/lib/logo-data';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    setLoggingOut(true);
    // Clear the auth cookie
    document.cookie = 'pdk_auth=; path=/; max-age=0; SameSite=Lax';
    toast.info('You have been logged out.');
    router.push('/login');
    router.refresh();
  };

  const isLoginPage = pathname === '/login';

  const navLinks = [
    { href: '/', label: 'New Invoice', icon: '📝' },
    { href: '/history', label: 'History', icon: '📋' },
    { href: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-[#1B5E20]/10 shadow-sm">
      <div className="max-w-6xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo / Brand */}
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white border border-[#1B5E20]/15 flex items-center justify-center p-1 shadow-sm group-hover:shadow-md transition-shadow duration-300 shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={BUSINESS_LOGO}
                alt="Priya Dream Kitchen Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-[#1B5E20] leading-tight tracking-tight truncate">
                Priya Dream Kitchen
              </h1>
              <p className="hidden xs:block text-[9px] sm:text-[11px] text-[#6D4C41] font-medium tracking-wider uppercase truncate">
                Cooking Class • Weligama
              </p>
            </div>
          </Link>

          {/* Navigation & User Actions */}
          {!isLoginPage && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <nav className="flex items-center gap-1">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`
                        relative flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200
                        ${
                          isActive
                            ? 'bg-gradient-to-r from-[#1B5E20] to-[#2E7D32] text-white shadow-md shadow-[#1B5E20]/20'
                            : 'text-[#4E342E] hover:bg-[#F5F0E6] hover:text-[#1B5E20]'
                        }
                      `}
                    >
                      <span>{link.icon}</span>
                      <span className="hidden sm:inline">{link.label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-red-200 bg-red-50/60 hover:bg-red-100/70 text-red-600 text-xs sm:text-sm font-semibold transition-all ml-1 disabled:opacity-50"
                title="Sign out"
              >
                <span>🚪</span>
                <span className="hidden md:inline">{loggingOut ? 'Signing out…' : 'Logout'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
