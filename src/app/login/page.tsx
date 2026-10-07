'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import { BUSINESS_LOGO } from '@/lib/logo-data';

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    if (username.trim() === ADMIN_USER && password === ADMIN_PASS) {
      // Set a simple auth cookie (expires in 30 days)
      document.cookie = `pdk_auth=authenticated; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
      toast.success('Welcome back, Admin!');
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const nextUrl = params?.get('next') || '/';
      router.push(nextUrl);
      router.refresh();
    } else {
      setErrorMessage('Invalid username or password.');
      toast.error('Invalid username or password.', 'Login Failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8 sm:py-12 animate-fade-in">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-[#1B5E20]/5 border border-[#1B5E20]/10 p-6 sm:p-10">
          {/* Brand & Title */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-white border border-[#1B5E20]/15 flex items-center justify-center p-2 shadow-md shadow-[#1B5E20]/10 mx-auto mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={BUSINESS_LOGO}
                alt="Priya Dream Kitchen Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-[#1B5E20] tracking-tight">
              Priya Dream Kitchen
            </h1>
            <p className="text-xs text-[#8D6E63] font-medium uppercase tracking-wider mt-1">
              Billing &amp; Invoicing Portal
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5 animate-fade-in">
              <span className="text-base shrink-0">⚠️</span>
              <span className="flex-1">{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-red-400 hover:text-red-700 font-bold"
              >
                ×
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#6D4C41] mb-1.5 uppercase tracking-wide">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">👤</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FBF7F0]/60 border border-[#1B5E20]/15 text-sm text-[#3E2723] focus:bg-white focus:border-[#1B5E20] transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#6D4C41] mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔒</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#FBF7F0]/60 border border-[#1B5E20]/15 text-sm text-[#3E2723] focus:bg-white focus:border-[#1B5E20] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#1B5E20] to-[#2E7D32] text-white text-sm font-bold shadow-lg shadow-[#1B5E20]/25 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <span className="text-base">→</span>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-[11px] text-[#8D6E63] leading-relaxed">
              Staff &amp; Admin access only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
