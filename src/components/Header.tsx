'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'New Invoice', icon: '📝' },
    { href: '/history', label: 'History', icon: '📋' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#1B5E20]/10 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo / Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#1B5E20] to-[#2E7D32] flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300">
              <span className="text-xl sm:text-2xl">🍛</span>
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-[#1B5E20] leading-tight tracking-tight">
                Priya Dream Kitchen
              </h1>
              <p className="text-[10px] sm:text-xs text-[#6D4C41] font-medium tracking-wider uppercase">
                Sri Lankan Cooking Class • Weligama
              </p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1 sm:gap-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    relative flex items-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-sm font-semibold transition-all duration-300
                    ${
                      isActive
                        ? 'bg-gradient-to-r from-[#1B5E20] to-[#2E7D32] text-white shadow-lg shadow-[#1B5E20]/25'
                        : 'text-[#4E342E] hover:bg-[#F5F0E6] hover:text-[#1B5E20]'
                    }
                  `}
                >
                  <span className="text-base">{link.icon}</span>
                  <span className="hidden sm:inline">{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
