'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Crown, Flame, LayoutDashboard, LogOut, Menu, Settings, Shield, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { Button } from './ui';
import { Logo } from './logo';

const LINKS = [
  { href: '/courses', label: 'Courses' },
  { href: '/practice', label: 'Practice' },
  { href: '/speaking', label: 'Speaking AI' },
  { href: '/writing', label: 'Writing AI' },
  { href: '/tests', label: 'AI Tests' },
  { href: '/pricing', label: 'Pricing' },
];

export function Navbar() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
    setMenu(false);
  }, [pathname]);

  useEffect(() => {
    const close = (e: MouseEvent) => menuRef.current && !menuRef.current.contains(e.target as Node) && setMenu(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  if (pathname.startsWith('/admin')) return null;

  const initials = user?.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium transition',
                pathname.startsWith(l.href) ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {loading ? (
            <div className="h-9 w-24 animate-pulse rounded-xl bg-slate-100" />
          ) : user ? (
            <>
              {!user.isPremium && (
                <Button href="/pricing" variant="gold" size="sm" className="hidden sm:inline-flex">
                  <Crown className="h-4 w-4" /> Go Premium
                </Button>
              )}
              <div className="hidden items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-sm font-bold text-orange-600 sm:flex" title="Daily streak">
                <Flame className="h-4 w-4" /> {user.streak}
              </div>
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenu((m) => !m)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white ring-2 ring-white shadow"
                  aria-label="Account menu"
                >
                  {initials}
                </button>
                {menu && (
                  <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lift animate-fade-up">
                    <div className="border-b border-slate-100 px-4 py-3">
                      <p className="truncate font-semibold text-slate-900">{user.name}</p>
                      <p className="truncate text-xs text-slate-500">{user.email}</p>
                      {user.isPremium && (
                        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-gold-100 px-2 py-0.5 text-xs font-bold text-gold-600">
                          <Crown className="h-3 w-3" /> Premium
                        </span>
                      )}
                    </div>
                    <div className="p-1.5">
                      <MenuLink href="/dashboard" icon={<LayoutDashboard className="h-4 w-4" />}>My dashboard</MenuLink>
                      <MenuLink href="/profile" icon={<Settings className="h-4 w-4" />}>Profile & billing</MenuLink>
                      {user.role === 'ADMIN' && <MenuLink href="/admin" icon={<Shield className="h-4 w-4" />}>Admin dashboard</MenuLink>}
                      <button
                        onClick={() => {
                          logout();
                          router.push('/');
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                      >
                        <LogOut className="h-4 w-4" /> Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Button href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                Sign in
              </Button>
              <Button href="/register" size="sm">
                Start free
              </Button>
            </>
          )}
          <button className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-slate-100 bg-white px-4 py-3 lg:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn('block rounded-xl px-3 py-2.5 font-medium', pathname.startsWith(l.href) ? 'bg-brand-50 text-brand-800' : 'text-slate-700')}
            >
              {l.label}
            </Link>
          ))}
          {user ? (
            <Link href="/dashboard" className="block rounded-xl px-3 py-2.5 font-medium text-slate-700">
              My dashboard
            </Link>
          ) : (
            <Link href="/login" className="block rounded-xl px-3 py-2.5 font-medium text-slate-700">
              Sign in
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}

function MenuLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
      {icon}
      {children}
    </Link>
  );
}
