'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import './customer-site.css';

const LOGO_IMG = (
  <img src="/nav-logo.png?v=2" alt="Sea of Blue" style={{ height: '22px', width: 'auto', display: 'block' }} />
);

const CHECK_SVG = (
  <svg viewBox="0 0 16 16" fill="none"><path d="M2 8.5L6 12.5L14 3.5" stroke="#F4EFE3" strokeWidth="2.4" strokeLinecap="square" /></svg>
);

export default function CustomerSiteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // These paths get the full public layout (header/footer/mobile bar)
  const isPublicPage =
    pathname === '/customer-site' ||
    pathname === '/customer-site/residential' ||
    pathname === '/customer-site/commercial';

  // Portal, login, forgot-password, quote — render children only (they have their own chrome)
  if (!isPublicPage) {
    return <>{children}</>;
  }

  const navLinks = [
    { href: '/customer-site', label: 'Home' },
    { href: '/customer-site/residential', label: 'Residential' },
    { href: '/customer-site/commercial', label: 'Commercial' },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <div className="cs-root">
      {/* Header */}
      <header className="cs-header">
        <div className="wrap hd">
          <Link className="logo" href="/customer-site">
            {LOGO_IMG}
          </Link>

          <nav className={`cs-nav${menuOpen ? ' open' : ''}`}>
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={isActive(l.href) ? 'active' : ''}
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="hd-cta">
            <a className="hd-phone" href="tel:4374751622">437 475 1622</a>
            <Link className="btn btn-solid" href="/customer-site#quote">Get My Price</Link>
            <button className="burger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
              <i /><i /><i />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="cs-footer">
        <div className="wrap">
          <div className="ft">
            <div>
              <Link className="logo" href="/customer-site" style={{ marginBottom: 16 }}>
                {LOGO_IMG}
              </Link>
              <p>Tech-enabled residential and commercial cleaning across the Greater Toronto Area. Liability insured, WSIB registered, background-checked, and guaranteed in writing.</p>
            </div>
            <div>
              <h4>Company</h4>
              {navLinks.map((l) => (
                <Link key={l.href} href={l.href}>{l.label}</Link>
              ))}
            </div>
            <div>
              <h4>Contact</h4>
              <a href="tel:4374751622">437 475 1622</a>
              <a href="sms:4374751622">Text Us</a>
              <a href="mailto:info@seaofblue.app">info@seaofblue.app</a>
            </div>
            <div>
              <h4>Service Areas</h4>
              <a href="/customer-site">Mississauga</a>
              <a href="/customer-site">Oakville</a>
              <a href="/customer-site">Brampton</a>
              <a href="/customer-site">Toronto and GTA</a>
              <a href="/customer-site">Guelph</a>
            </div>
          </div>
          <div className="copyright">
            <span>&copy; 2026 Sea of Blue. All rights reserved.</span>
            <span>Ontario, Canada</span>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Bar */}
      <div className="mbar">
        <a href="tel:4374751622">Call</a>
        <a href="sms:4374751622">Text</a>
        <Link href="/customer-site#quote">Quote</Link>
      </div>
    </div>
  );
}
