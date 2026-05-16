'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, Briefcase, UserCheck,
  Receipt, Settings, ClipboardList, Waves,
  Building2, AlertTriangle, Package,
  UsersRound, TrendingUp, Globe,
  Menu, X,
} from 'lucide-react';

import { ScrollArea } from '@/components/ui/scroll-area';

const sidebarItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/leads', label: 'Leads', icon: ClipboardList },
  { href: '/admin/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/contractors', label: 'Contractors', icon: UserCheck },
  { href: '/admin/teams', label: 'Teams', icon: UsersRound },
  { href: '/admin/payouts', label: 'Payouts', icon: Receipt },
  { href: '/admin/disputes', label: 'Disputes', icon: AlertTriangle },
  { href: '/admin/supply', label: 'Supply', icon: Package },
  { href: '/admin/partners', label: 'Partners', icon: Building2 },
  { href: '/admin/zones', label: 'Zones', icon: Globe },
  { href: '/admin/finance', label: 'Finance', icon: TrendingUp },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];



export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Close sidebar on escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSidebarOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600">
          <Waves className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-foreground">Sea of Blue</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Operations</p>
        </div>
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-3">
          {sidebarItems.map((item) => {
            const isActive = item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border">
        <p className="text-[10px] text-muted-foreground">
          Sea of Blue v3.0
        </p>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-3 border-b border-border bg-card lg:hidden">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Toggle menu"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-600">
            <Waves className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-bold text-sm">Sea of Blue</span>
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — desktop: always visible; mobile: slide-in drawer */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-72 border-r border-border bg-card flex flex-col
          transition-transform duration-300 ease-in-out
          lg:static lg:w-64 lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {sidebarContent}
      </aside>

      {/* Main content — add top padding on mobile for the top bar */}
      <main className="flex-1 overflow-auto pt-14 lg:pt-0">
        <div className={pathname === '/admin' ? '' : 'p-4 md:p-8'}>
          {children}
        </div>
      </main>
    </div>
  );
}
