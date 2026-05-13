'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, Clock, DollarSign, Waves } from 'lucide-react';

const navItems = [
  { href: '/contractor', label: 'Today', icon: CalendarDays },
  { href: '/contractor/availability', label: 'Availability', icon: Clock },
  { href: '/contractor/earnings', label: 'Earnings', icon: DollarSign },
];

export default function ContractorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Don't show layout on login page
  if (pathname === '/contractor/login') {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background max-w-lg mx-auto">
      {/* Top bar */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card sticky top-0 z-40">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600">
          <Waves className="h-4 w-4 text-white" />
        </div>
        <span className="font-bold text-sm">Sea of Blue</span>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-20 px-4 py-4">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto border-t border-border bg-card z-40">
        <div className="flex justify-around py-2">
          {navItems.map((item) => {
            const isActive = item.href === '/contractor'
              ? pathname === '/contractor'
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-2 px-4 rounded-lg min-h-[48px] min-w-[48px] justify-center transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
