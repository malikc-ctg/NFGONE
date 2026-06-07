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
  { href: '/wegettinmoneynga', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/wegettinmoneynga/leads', label: 'Leads', icon: ClipboardList },
  { href: '/wegettinmoneynga/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/wegettinmoneynga/customers', label: 'Customers', icon: Users },
  { href: '/wegettinmoneynga/contractors', label: 'Contractors', icon: UserCheck },
  { href: '/wegettinmoneynga/teams', label: 'Teams', icon: UsersRound },
  { href: '/wegettinmoneynga/payouts', label: 'Payouts', icon: Receipt },
  { href: '/wegettinmoneynga/disputes', label: 'Disputes', icon: AlertTriangle },
  { href: '/wegettinmoneynga/supply', label: 'Supply', icon: Package },
  { href: '/wegettinmoneynga/partners', label: 'Partners', icon: Building2 },
  { href: '/wegettinmoneynga/zones', label: 'Zones', icon: Globe },
  { href: '/wegettinmoneynga/finance', label: 'Finance', icon: TrendingUp },
  { href: '/wegettinmoneynga/settings', label: 'Settings', icon: Settings },
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

  // Don't show layout on login page
  if (pathname === '/wegettinmoneynga/login') {
    return <>{children}</>;
  }

  const sidebarContent = (
    <>
      <div className="flex flex-col items-center justify-center gap-2 px-6 py-5 border-b border-border text-center">
        <img src="/logo.png" alt="Sea of Blue Logo" className="w-48 h-48 object-contain" />
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Operations</p>
        </div>
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-3">
          {sidebarItems.map((item) => {
            const isActive = item.href === '/wegettinmoneynga'
              ? pathname === '/wegettinmoneynga'
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
          <img src="/logo.png" alt="Sea of Blue Logo" className="w-40 h-20 object-contain" />
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
        <div className={pathname === '/wegettinmoneynga' ? '' : 'p-4 md:p-8'}>
          {children}
        </div>
      </main>
    </div>
  );
}
