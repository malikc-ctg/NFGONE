'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function CustomerSiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPortal = pathname?.startsWith('/customer-site/portal');

  return (
    <div className="bg-[#001a36] min-h-screen text-white selection:bg-white/20 selection:text-white flex flex-col font-sans overflow-x-clip">
      
      {/* Immersive Header - Hidden in Portal */}
      {!isPortal && (
        <header className="fixed top-0 left-0 right-0 z-50 w-full bg-[#001a36]/80 backdrop-blur-md border-b border-white/5">
          <div className="container max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <Link href="/" className="flex items-center group">
              <img 
                src="/nav-logo.png?v=2" 
                alt="Sea of Blue" 
                className="h-5 w-auto object-contain opacity-90 group-hover:opacity-100 transition-opacity"
              />
            </Link>
            <nav className="hidden md:flex items-center gap-8 text-sm font-medium tracking-wide">
              <Link href="/#services" className="text-white/60 hover:text-white transition-colors">
                Services
              </Link>
              <Link href="/#dispatch" className="text-white/60 hover:text-white transition-colors">
                Dispatch Network
              </Link>
              <Link href="/customer-site/login" className="text-white/60 hover:text-white transition-colors">
                Sign In
              </Link>
              <Link 
                href="/customer-site/quote" 
                className="bg-white text-[#001a36] px-6 py-2.5 rounded-full hover:bg-white/90 transition-colors font-semibold"
              >
                Get a Quote
              </Link>
            </nav>
            
            {/* Mobile menu placeholder */}
            <button className="md:hidden text-white/80 p-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={`flex-1 ${!isPortal ? 'pt-20' : ''}`}>
        {children}
      </main>

      {/* Minimal Footer - Hidden in Portal */}
      {!isPortal && (
        <footer className="bg-[#010A14] pt-20 pb-10 border-t border-white/5 text-sm">
          <div className="container max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-16">
              <Link href="/">
                <img 
                  src="/nav-logo.png?v=2" 
                  alt="Sea of Blue" 
                  className="h-4 w-auto object-contain opacity-50 hover:opacity-100 transition-opacity"
                />
              </Link>
              <nav className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-white/40">
                <Link href="/" className="hover:text-white transition-colors">Home</Link>
                <Link href="/#services" className="hover:text-white transition-colors">Services</Link>
                <Link href="/#coverage" className="hover:text-white transition-colors">Coverage</Link>
                <Link href="/contractors" className="hover:text-white transition-colors">Contractors</Link>
                <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
                <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
              </nav>
            </div>
            
            <div className="text-center text-white/20 text-xs">
              <p className="mb-2">Sea of Blue &copy; {new Date().getFullYear()}. All rights reserved.</p>
              <p>Home Services, Dispatched.</p>
            </div>
          </div>
        </footer>
      )}
      
    </div>
  );
}
