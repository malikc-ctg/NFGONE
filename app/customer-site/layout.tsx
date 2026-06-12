import Link from 'next/link';
import { Waves } from 'lucide-react';

export default function CustomerSiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#f8fafc] min-h-screen text-slate-900 selection:bg-[#001a36]/20 selection:text-[#001a36] flex flex-col font-sans">
      
      {/* Customer Header */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="container max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/customer-site" className="flex items-center gap-2 group">
            <Waves className="h-6 w-6 text-[#001a36] group-hover:text-blue-600 transition-colors" />
            <span className="font-rustic text-xl font-bold tracking-wide text-[#001a36]">
              SEA OF BLUE
            </span>
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link href="/customer-site#services" className="text-slate-600 hover:text-[#001a36] transition-colors">
              Services
            </Link>
            <Link href="/customer-site#smart-care" className="text-slate-600 hover:text-[#001a36] transition-colors">
              Smart Care
            </Link>
            <Link href="/customer-site/login" className="text-slate-600 hover:text-[#001a36] transition-colors">
              Sign In
            </Link>
            <Link 
              href="/customer-site#quote" 
              className="bg-[#001a36] text-white px-5 py-2 rounded-full hover:bg-[#022850] transition-colors"
            >
              Get a Quote
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Customer Footer */}
      <footer className="bg-[#010A14] text-white/40 pt-16 pb-8 border-t border-[#021A35]">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Waves className="h-6 w-6 text-white/80" />
                <span className="font-rustic text-xl tracking-wide text-white">SEA OF BLUE</span>
              </div>
              <p className="text-sm max-w-sm leading-relaxed">
                Premium, technology-driven residential pool and spa care across Ontario. 
                Smarter maintenance for a healthier pool.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Services</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white transition-colors">Weekly Maintenance</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Chemical Balancing</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Equipment Diagnostics</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Openings & Closings</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/apply" className="hover:text-white transition-colors">Become a Provider</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs">
            <p>&copy; {new Date().getFullYear()} Sea of Blue Home Services. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
      
    </div>
  );
}
