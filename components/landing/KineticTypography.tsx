'use client';

import { useRef, useEffect } from 'react';
import { useReducedMotion } from '@/lib/motion/hooks';
import { gsap, ScrollTrigger } from '@/lib/motion/index';

const WORDS = ['QUALITY', 'TRUST', 'GROWTH'];

export function KineticTypography() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || !sectionRef.current) return;

    const ctx = gsap.context(() => {
      const words = sectionRef.current!.querySelectorAll('.kinetic-word');

      words.forEach((word, i) => {
        gsap.from(word, {
          yPercent: 120,
          scale: 1.1,
          opacity: 0,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: word,
            start: 'top 90%',
            end: 'top 50%',
            scrub: 1,
          },
        });
      });
    }, sectionRef.current);

    return () => ctx.revert();
  }, [reduced]);

  return (
    <section
      ref={sectionRef}
      id="promise"
      className="relative py-32 md:py-48 overflow-hidden"
      style={{ backgroundColor: '#001a36' }}
    >
      {/* Label */}
      <div className="container max-w-6xl mx-auto px-6 relative z-10">
        <p className="text-white/40 text-sm tracking-[0.3em] uppercase mb-12 text-center">
          Why Us?
        </p>

        <h2 className="font-rustic text-white text-2xl md:text-4xl text-center max-w-3xl mx-auto mb-20 leading-relaxed">
          Build your business and connect with customers through Ontario&apos;s trusted network of service professionals.
        </h2>
      </div>

      {/* Big kinetic words */}
      <div className="container max-w-7xl mx-auto px-6 space-y-8 md:space-y-4">
        {WORDS.map((word) => (
          <div key={word} className="overflow-hidden">
            <h2 className="kinetic-word font-rustic text-white text-[15vw] md:text-[18vw] leading-[0.85] tracking-tighter text-center uppercase">
              {word}
            </h2>
          </div>
        ))}
      </div>
    </section>
  );
}
