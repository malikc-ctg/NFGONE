'use client';

import Link from 'next/link';

export function Footer() {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="relative border-t border-white/5 pt-20 pb-12" style={{ backgroundColor: '#010A14' }}>
      {/* Deep blue overlay to matching immersive color scheme */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#021A35]/10 to-[#010A14] pointer-events-none" />

      <div className="container max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-16">
          {/* Brand Column */}
          <div className="md:col-span-5 flex flex-col items-start gap-4">
            <button
              onClick={() => scrollTo('hero')}
              className="flex items-center justify-start focus:outline-none focus:ring-2 focus:ring-white/40 rounded-sm transition-opacity hover:opacity-80 animate-fade-in"
              aria-label="Scroll to top"
            >
              <img
                src="/nav-logo.png?v=2"
                alt="Sea of Blue"
                className="h-4 w-auto object-contain"
              />
            </button>
            <p className="text-white/40 text-sm leading-relaxed max-w-sm mt-2">
              A private home services network built on reliability, professional service standards, and selective contractor growth.
            </p>
          </div>

          {/* Quick Links Column */}
          <div className="md:col-span-3 flex flex-col gap-4">
            <h4 className="text-white/80 font-bold text-sm uppercase tracking-wider">
              Navigation
            </h4>
            <ul className="flex flex-col gap-2.5 text-sm">
              {[
                { label: 'Intro', target: 'hero' },
                { label: 'Services', target: 'services' },
                { label: 'About', target: 'about' },
                { label: 'Apply', target: 'contact' },
              ].map((link) => (
                <li key={link.label}>
                  <button
                    onClick={() => scrollTo(link.target)}
                    className="text-white/40 hover:text-white transition-colors focus:outline-none focus:underline"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Portal Links Column */}
          <div className="md:col-span-2 flex flex-col gap-4">
            <h4 className="text-white/80 font-bold text-sm uppercase tracking-wider">
              Portals
            </h4>
            <ul className="flex flex-col gap-2.5 text-sm text-white/40">
              <li>
                <Link href="/contractor/login" className="hover:text-white transition-colors">
                  Contractor Portal
                </Link>
              </li>
              <li>
                <Link href="/admin/login" className="hover:text-white transition-colors">
                  Admin Portal
                </Link>
              </li>
              <li>
                <Link href="/partner" className="hover:text-white transition-colors">
                  Partner Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Location Column */}
          <div className="md:col-span-2 flex flex-col gap-4">
            <h4 className="text-white/80 font-bold text-sm uppercase tracking-wider">
              Region
            </h4>
            <div className="text-sm text-white/40 flex flex-col gap-1">
              <p>Ontario, Canada</p>
              <p className="text-xs text-white/30 italic">Currently accepting private beta applications</p>
            </div>
          </div>
        </div>

        {/* Footer bottom details */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/30">
          <p>&copy; {new Date().getFullYear()} Sea of Blue. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-white/60 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white/60 transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
