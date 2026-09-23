'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, FileText, Plus, User, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const navItems = [
  { href: '/customer-site/portal', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customer-site/portal/billing', label: 'Invoices', icon: FileText },
  { href: '/customer-site/portal/quote', label: 'New Quote', icon: Plus },
  { href: '/customer-site/portal/profile', label: 'Profile', icon: User },
];

export default function CustomerPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/customer-site/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/customer-site/portal" className="flex items-center gap-2">
            <img src="/logo.png" alt="Sea of Blue" className="h-8 w-auto object-contain" />
            <span className="font-bold text-[#001a36] hidden sm:block text-sm">Customer Portal</span>
          </Link>
          
          <div className="flex items-center gap-3">
            <Link 
              href="/customer-site/portal/quote" 
              className="hidden md:flex items-center gap-1.5 bg-[#001a36] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#022850] transition-colors"
            >
              <Plus className="h-4 w-4" /> Request Quote
            </Link>
            <button onClick={handleSignOut} className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1.5 text-sm font-medium">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:block">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pb-24 md:pb-8 md:pl-56">
        {children}
      </main>

      {/* Mobile Bottom Navigation — hidden on md+ where sidebar takes over */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 safe-bottom">
        <div className="flex justify-around py-1 px-2">
          {navItems.map((item) => {
            const isActive = item.href === '/customer-site/portal' 
              ? pathname === '/customer-site/portal' 
              : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg min-w-[60px] transition-colors ${
                  isActive ? 'text-[#001a36]' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-bold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop/Tablet Sidebar — visible on md+ */}
      <div className="hidden md:block fixed top-14 left-0 bottom-0 w-56 bg-white border-r border-slate-200 p-3 z-30 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map((item) => {
            const isActive = item.href === '/customer-site/portal' 
              ? pathname === '/customer-site/portal' 
              : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors text-sm ${
                  isActive 
                    ? 'bg-blue-50 text-[#001a36]' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon className={`h-4 w-4 ${isActive ? 'text-[#001a36]' : 'text-slate-400'}`} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

    </div>
  );
}
