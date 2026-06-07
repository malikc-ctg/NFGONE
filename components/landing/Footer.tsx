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
            {/* Social Links */}
            <div className="flex gap-3 mt-4">
              <a
                href="https://www.instagram.com/seaofblueplatform/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/40 hover:text-white transition-colors p-2 bg-white/5 hover:bg-white/10 rounded-full focus:outline-none focus:ring-2 focus:ring-white/40"
                aria-label="Instagram"
              >
                <svg
                  className="w-[18px] h-[18px]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </a>
              <a
                href="https://facebook.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/40 hover:text-white transition-colors p-2 bg-white/5 hover:bg-white/10 rounded-full focus:outline-none focus:ring-2 focus:ring-white/40"
                aria-label="Facebook"
              >
                <svg
                  className="w-[18px] h-[18px]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
              <a
                href="https://twitter.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/40 hover:text-white transition-colors p-2 bg-white/5 hover:bg-white/10 rounded-full focus:outline-none focus:ring-2 focus:ring-white/40"
                aria-label="Twitter / X"
              >
                <svg
                  className="w-[18px] h-[18px]"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
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
                <Link href="/booking" className="hover:text-white transition-colors">
                  Customer Portal
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
