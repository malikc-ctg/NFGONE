'use client';

import { useRef } from 'react';
import { useFadeIn, useLineReveal } from '@/lib/motion/hooks';
import { OceanCanvas } from '@/components/landing/OceanCanvas';

export function Hero() {
  const sectionRef   = useRef<HTMLElement>(null);
  const headlineRef  = useRef<HTMLHeadingElement>(null);
  const subRef       = useRef<HTMLParagraphElement>(null);

  useFadeIn(headlineRef, { delay: 0.3, duration: 1.4, y: 30 });
  useLineReveal(subRef,  { delay: 0.8, stagger: 0.1, duration: 1.0 });

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#010A14' }}
    >
      {/* WebGL ocean environment — hero only */}
      <OceanCanvas />

      {/* Content — sits above the ocean */}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto flex flex-col items-center">
        <h1
          ref={headlineRef}
          className="mb-8 flex justify-center w-full"
        >
          <img
            src="/logo.png"
            alt="Sea of Blue"
            className="w-auto h-[280px] sm:h-[450px] md:h-[800px] lg:h-[1100px] object-contain select-none pointer-events-none -my-[80px] sm:-my-[140px] md:-my-[240px] lg:-my-[320px]"
          />
        </h1>
        <p
          ref={subRef}
          className="text-white/60 text-xl md:text-2xl lg:text-3xl tracking-wide uppercase"
        >
          Home Service Network
        </p>
      </div>

      {/* Wave divider at bottom */}
      <div className="absolute bottom-0 left-0 w-full z-10">
        <svg
          viewBox="0 0 1440 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto block"
          preserveAspectRatio="none"
        >
          <path
            d="M0 60C240 120 480 0 720 60C960 120 1200 0 1440 60V120H0V60Z"
            fill="#001a36"
          />
        </svg>
      </div>
    </section>
  );
}
