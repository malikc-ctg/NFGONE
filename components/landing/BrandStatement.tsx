'use client';

import { useRef } from 'react';
import { useWordReveal, useParallaxLayer, useFadeIn } from '@/lib/motion/hooks';

export function BrandStatement() {
  const sectionRef = useRef<HTMLElement>(null);
  const statementRef = useRef<HTMLHeadingElement>(null);
  const blurRef1 = useRef<HTMLDivElement>(null);
  const blurRef2 = useRef<HTMLDivElement>(null);
  const triadRef = useRef<HTMLDivElement>(null);

  useWordReveal(statementRef, { scrub: 1, stagger: 0.03 });
  useParallaxLayer(blurRef1, -0.2);
  useParallaxLayer(blurRef2, 0.15);
  useFadeIn(triadRef, { delay: 0.2 });

  return (
    <section
      ref={sectionRef}
      id="about"
      className="relative py-32 md:py-48 overflow-hidden"
      style={{ backgroundColor: '#001a36' }}
    >
      {/* Blurred depth shapes */}
      <div
        ref={blurRef1}
        className="parallax-layer absolute -top-20 -right-32 w-[500px] h-[500px] opacity-15"
      >
        <img src="/blur-shape.png" alt="" className="w-full h-full object-contain" aria-hidden="true" />
      </div>
      <div
        ref={blurRef2}
        className="parallax-layer absolute bottom-0 -left-20 w-[400px] h-[400px] opacity-10 rotate-180"
      >
        <img src="/blur-shape.png" alt="" className="w-full h-full object-contain" aria-hidden="true" />
      </div>

      {/* Label */}
      <div className="container max-w-6xl mx-auto px-6 relative z-10">
        <p className="text-white/40 text-sm tracking-[0.3em] uppercase mb-12">
          Who We Are
        </p>

        {/* Main kinetic statement */}
        <div
          ref={statementRef}
          className="font-rustic text-white text-3xl md:text-5xl lg:text-6xl leading-snug max-w-4xl space-y-8"
        >
          <p>
            Sea of Blue is a private home services network currently launching in beta with cleaning professionals, cleaning teams, and cleaning companies.
          </p>
          <p>
            We are building a selective contractor network focused on reliability, communication, and professional service standards. Every application is manually reviewed before approval, and acceptance is not guaranteed.
          </p>
          <p>
            Our goal is simple: connect quality cleaning providers with real service opportunities while giving customers a more organized, trusted way to book home services.
          </p>
        </div>

        {/* Value triad */}
        <div
          ref={triadRef}
          className="mt-20 flex flex-col sm:flex-row items-start sm:items-center gap-8 sm:gap-16"
        >
          {['Quality', 'Trust', 'Growth'].map((word, i) => (
            <div key={word} className="flex items-center gap-4">
              {i > 0 && (
                <span className="hidden sm:block w-16 h-px bg-white/20" />
              )}
              <span className="text-white/50 text-sm tracking-[0.2em] uppercase">
                {word}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
