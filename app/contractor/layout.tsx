'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { CalendarDays, Clock, DollarSign, Waves, User, ReceiptText, Briefcase, WifiOff } from 'lucide-react';

const navItems = [
  { href: '/contractor', label: 'Dashboard', icon: CalendarDays },
  { href: '/contractor/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/contractor/earnings', label: 'Earnings', icon: DollarSign },
  { href: '/contractor/expenses', label: 'Expenses', icon: ReceiptText },
  { href: '/contractor/profile', label: 'Profile', icon: User },
];


export default function ContractorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }

    // Track online/offline status
    function handleOnline() { setIsOffline(false); }
    function handleOffline() { setIsOffline(true); }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (!navigator.onLine) {
      setIsOffline(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Don't show layout on login or onboarding pages
  if (pathname === '/contractor/login' || pathname === '/contractor/onboarding') {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background max-w-lg mx-auto">
      {/* Top bar */}
      <header className="flex flex-col border-b border-border bg-card sticky top-0 z-40">
        <div className="flex items-center gap-3 px-4 py-3">
          <img src="/logo.png" alt="Sea of Blue Logo" className="w-40 h-20 object-contain" />
          <span className="font-bold text-sm">Sea of Blue</span>
        </div>
        
        {/* Offline Banner */}
        {isOffline && (
          <div className="bg-red-500 text-white text-xs font-bold py-1.5 px-4 flex items-center justify-center gap-2">
            <WifiOff className="h-3.5 w-3.5" />
            You're offline. Changes will sync when reconnected.
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-20 px-4 py-4">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto border-t border-border bg-card z-40 safe-bottom">
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
