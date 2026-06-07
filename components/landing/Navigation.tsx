'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useLenis } from '@/lib/motion/LenisProvider';

const NAV_ITEMS = [
  { label: 'Intro', target: 'hero' },
  { label: 'Services', target: 'services' },
  { label: 'About', target: 'about' },
  { label: 'Apply', target: 'contact' },
];

export function Navigation() {
  const [activeSection, setActiveSection] = useState('hero');
  const [visible, setVisible] = useState(false);
  const [scrolledUp, setScrolledUp] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const lastScrollY = useRef(0);
  const { stopScroll, startScroll } = useLenis();

  // Handle mobile menu scroll locking
  useEffect(() => {
    if (mobileMenuOpen) {
      stopScroll();
    } else {
      startScroll();
    }
    return () => {
      startScroll();
    };
  }, [mobileMenuOpen, stopScroll, startScroll]);

  // Handle screen resize to close mobile menu
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Show nav after a brief delay (after gate dismissal)
    const timer = setTimeout(() => setVisible(true), 100);

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Determine scrolled state (for background glassmorphism)
      setIsScrolled(currentScrollY > 10);

      // Near top of the page: always show navigation
      if (currentScrollY < 50) {
        setScrolledUp(true);
      } else if (currentScrollY > lastScrollY.current) {
        // Scrolling down: hide navigation
        setScrolledUp(false);
      } else {
        // Scrolling up: show navigation
        setScrolledUp(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

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
      window.removeEventListener('scroll', handleScroll);
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
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-[80] transition-all duration-300 ${
          visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        } ${
          scrolledUp || mobileMenuOpen ? 'translate-y-0' : '-translate-y-full'
        } ${
          isScrolled || mobileMenuOpen ? 'bg-[#010A14]/90 backdrop-blur-md border-b border-white/5' : 'bg-transparent'
        }`}
      >
        <div className="container max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              scrollTo('hero');
            }}
            className="flex items-center justify-start focus:outline-none focus:ring-2 focus:ring-white/40 rounded-sm transition-opacity hover:opacity-80"
            aria-label="Scroll to top"
          >
            <img
              src="/nav-logo.png?v=2"
              alt="Sea of Blue"
              className="h-4 w-auto object-contain"
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
                <span className="block relative overflow-hidden">
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

          {/* Right side: Apply link + Sound + Hamburger */}
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

            {/* Mobile Menu Trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-white/60 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 p-2 -mr-2 rounded"
              aria-label="Toggle mobile menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-[70] bg-[#010A14]/98 backdrop-blur-xl transition-all duration-500 md:hidden flex flex-col justify-center px-8 ${
          mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <nav className="flex flex-col gap-6" aria-label="Mobile navigation">
          {NAV_ITEMS.map(({ label, target }) => (
            <button
              key={target}
              onClick={() => {
                setMobileMenuOpen(false);
                scrollTo(target);
              }}
              className={`text-left text-3xl font-rustic tracking-[0.15em] uppercase transition-colors py-2 block ${
                activeSection === target ? 'text-white border-l-2 border-white pl-4' : 'text-white/40 pl-0'
              }`}
            >
              {label}
            </button>
          ))}
          <Link
            href="/apply"
            onClick={() => setMobileMenuOpen(false)}
            className="text-left text-3xl font-rustic tracking-[0.15em] uppercase text-white/40 hover:text-white py-2 block"
          >
            Apply
          </Link>
        </nav>
      </div>
    </>
  );
}
