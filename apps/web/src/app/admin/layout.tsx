'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, BookOpen, CreditCard, ExternalLink, Layers, ListChecks, Tags, Users } from 'lucide-react';
import { Logo } from '@/components/logo';
import { RequireAuth } from '@/components/require-auth';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/admin', label: 'Overview', icon: BarChart3, exact: true },
  { href: '/admin/users', label: 'Students', icon: Users },
  { href: '/admin/courses', label: 'Courses & lessons', icon: BookOpen },
  { href: '/admin/practices', label: 'Practices & tests', icon: ListChecks },
  { href: '/admin/levels', label: 'Levels', icon: Layers },
  { href: '/admin/plans', label: 'Plans', icon: Tags },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const active = (n: (typeof NAV)[number]) => (n.exact ? pathname === n.href : pathname.startsWith(n.href));
  return (
    <RequireAuth admin>
      <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[260px_1fr]">
        <aside className="hidden border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="flex h-16 items-center border-b border-slate-100 px-5">
            <Logo />
          </div>
          <p className="px-5 pt-5 pb-2 text-xs font-bold tracking-wider text-slate-400 uppercase">Admin</p>
          <nav className="flex-1 space-y-1 px-3">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  active(n) ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                )}
              >
                <n.icon className="h-4.5 w-4.5" /> {n.label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-slate-100 p-4">
            <Link href="/" className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
              <ExternalLink className="h-4 w-4" /> View site
            </Link>
            <p className="mt-3 truncate text-xs text-slate-400">Signed in as {user?.email}</p>
          </div>
        </aside>
        <div className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur lg:hidden">
            <div className="flex h-14 items-center justify-between px-4">
              <Logo />
              <Link href="/" className="text-sm font-medium text-slate-600">View site</Link>
            </div>
            <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className={cn('shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium', active(n) ? 'bg-brand-50 text-brand-800' : 'text-slate-600')}>
                  {n.label}
                </Link>
              ))}
            </nav>
          </header>
          <main className="p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </RequireAuth>
  );
}
