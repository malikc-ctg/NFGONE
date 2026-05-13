'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, PlusCircle, Briefcase, FileText, Settings, Waves } from 'lucide-react';

const navItems = [
  { href: '/partner', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/partner/book', label: 'Book a Job', icon: PlusCircle },
  { href: '/partner/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/partner/invoices', label: 'Invoices', icon: FileText },
  { href: '/partner/account', label: 'Account', icon: Settings },
];

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-60 border-r border-border bg-card flex flex-col">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600">
            <Waves className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground">Sea of Blue</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Partner Portal</p>
          </div>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = item.href === '/partner'
              ? pathname === '/partner'
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

        <div className="px-5 py-4 border-t border-border">
          <p className="text-[10px] text-muted-foreground">Partner Portal v3.0</p>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
