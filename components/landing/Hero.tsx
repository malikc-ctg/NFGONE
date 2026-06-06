'use client';

import { useRef } from 'react';
import { useParallaxLayer, useFadeIn, useLineReveal } from '@/lib/motion/hooks';

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const midRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);

  // Parallax at different speeds
  useParallaxLayer(bgRef, -0.15);
  useParallaxLayer(midRef, -0.3);

  // Headline reveal (now logo)
  useFadeIn(headlineRef, { delay: 0.3, duration: 1.4, y: 30 });
  useLineReveal(subRef, { delay: 0.8, stagger: 0.1, duration: 1.0 });

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#001a36' }}
    >
      {/* Background layer — slowest parallax */}
      <div
        ref={bgRef}
        className="parallax-layer absolute inset-0 w-full h-[120%] -top-[10%]"
      >
        <img
          src="/hero-bg.png"
          alt=""
          className="w-full h-full object-cover"
          aria-hidden="true"
        />
      </div>

      {/* Mid layer */}
      <div
        ref={midRef}
        className="parallax-layer absolute inset-0 w-full h-[130%] -top-[15%] opacity-40 mix-blend-screen"
      >
        <img
          src="/hero-mid.png"
          alt=""
          className="w-full h-full object-cover"
          aria-hidden="true"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto flex flex-col items-center">
        <h1
          ref={headlineRef}
          className="mb-8 flex justify-center w-full"
        >
          <img
            src="/logo.png"
            alt="Sea of Blue"
            className="w-auto h-[500px] md:h-[800px] lg:h-[1100px] object-contain select-none pointer-events-none -my-[140px] md:-my-[240px] lg:-my-[320px]"
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
      <div className="absolute bottom-0 left-0 w-full">
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
