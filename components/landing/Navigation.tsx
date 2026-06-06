'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

const NAV_ITEMS = [
  { label: 'Intro', target: 'hero' },
  { label: 'Services', target: 'services' },
  { label: 'About', target: 'about' },
  { label: 'Contact', target: 'contact' },
];

export function Navigation() {
  const [activeSection, setActiveSection] = useState('hero');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show nav after a brief delay (after gate dismissal)
    const timer = setTimeout(() => setVisible(true), 100);

    // Use IntersectionObserver for active section tracking
    const observers: IntersectionObserver[] = [];

    NAV_ITEMS.forEach(({ target }) => {
      const el = document.getElementById(target);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(target);
          }
        },
        { threshold: 0.3 }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => {
      clearTimeout(timer);
      observers.forEach((obs) => obs.disconnect());
    };
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-[80] transition-opacity duration-700 ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="container max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <button
          onClick={() => scrollTo('hero')}
          className="flex items-center justify-start focus:outline-none focus:ring-2 focus:ring-white/40 rounded-sm transition-opacity hover:opacity-80"
          aria-label="Scroll to top"
        >
          <img
            src="/nav-logo.png"
            alt="Sea of Blue"
            className="h-8 w-auto object-contain"
          />
        </button>

        {/* Nav items — hidden on mobile */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {NAV_ITEMS.map(({ label, target }) => (
            <button
              key={target}
              onClick={() => scrollTo(target)}
              className={`group relative overflow-hidden px-4 py-2 text-sm tracking-[0.15em] uppercase transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 rounded ${
                activeSection === target ? 'text-white' : 'text-white/40 hover:text-white/70'
              }`}
              aria-current={activeSection === target ? 'true' : undefined}
            >
              {/* Doubled label swap */}
              <span className="block relative">
                <span className="block transition-transform duration-400 group-hover:-translate-y-full">
                  {label}
                </span>
                <span className="block absolute inset-0 flex items-center justify-center transition-transform duration-400 translate-y-full group-hover:translate-y-0">
                  {label}
                </span>
              </span>

              {/* Active indicator */}
              {activeSection === target && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
              )}
            </button>
          ))}
        </nav>

        {/* Right side: Apply link + Sound */}
        <div className="flex items-center gap-4">
          <Link
            href="/apply"
            className="text-white/60 text-sm tracking-[0.15em] uppercase hover:text-white transition-colors hidden sm:block"
          >
            Apply
          </Link>

          {/* Sound toggle (stubbed) */}
          <button
            className="text-white/30 text-xs flex items-center gap-1.5 hover:text-white/60 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 rounded px-2 py-1"
            aria-label="Toggle sound (disabled)"
            disabled
          >
            <span className="flex gap-[1.5px]">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className="w-[1.5px] bg-white/30 rounded-full inline-block"
                  style={{ height: `${6 + Math.random() * 6}px` }}
                />
              ))}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
