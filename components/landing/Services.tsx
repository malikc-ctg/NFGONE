'use client';

import { useRef, useEffect } from 'react';
import { useReducedMotion, useParallaxLayer } from '@/lib/motion/hooks';
import { gsap, ScrollTrigger } from '@/lib/motion/index';

const SERVICES = [
  {
    number: '01',
    title: 'Residential Cleaning',
    description: 'Standard Cleaning, Deep Cleaning, Move-In / Move-Out Cleaning, Post-Construction Cleaning, and Airbnb Turnovers.',
  },
  {
    number: '02',
    title: 'Commercial Cleaning',
    description: 'Office Cleaning, Retail Cleaning, Facility Cleaning, and Common Area Cleaning for businesses across Ontario.',
  },
  {
    number: '03',
    title: 'Specialty Cleaning',
    description: 'Window Cleaning, Pressure Washing, Carpet Cleaning, and specialized services for unique cleaning needs.',
  },
];

export function Services() {
  const sectionRef = useRef<HTMLElement>(null);
  const blurRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useParallaxLayer(blurRef, -0.25);

  useEffect(() => {
    if (reduced || !sectionRef.current) return;

    const ctx = gsap.context(() => {
      const items = sectionRef.current!.querySelectorAll('.service-item');

      items.forEach((item) => {
        const number = item.querySelector('.service-number');
        const title = item.querySelector('.service-title');
        const desc = item.querySelector('.service-desc');
        const line = item.querySelector('.service-line');

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: item,
            start: 'top 80%',
            end: 'top 40%',
            scrub: 1,
          },
        });

        tl.from(number, {
          yPercent: 60,
          opacity: 0,
          duration: 0.5,
          ease: 'power3.out',
        })
        .from(title, {
          yPercent: 100,
          opacity: 0,
          duration: 0.6,
          ease: 'power3.out',
        }, '-=0.3')
        .from(desc, {
          opacity: 0,
          y: 20,
          duration: 0.5,
          ease: 'power3.out',
        }, '-=0.2')
        .from(line, {
          scaleX: 0,
          transformOrigin: 'left',
          duration: 0.4,
          ease: 'power3.out',
        }, '-=0.3');
      });
    }, sectionRef.current);

    return () => ctx.revert();
  }, [reduced]);

  return (
    <section
      ref={sectionRef}
      id="services"
      className="relative py-32 md:py-48 overflow-hidden"
      style={{ backgroundColor: '#001a36' }}
    >
      {/* Blurred depth shapes */}
      <div
        ref={blurRef}
        className="parallax-layer absolute top-1/4 right-0 w-[500px] h-[500px] opacity-10"
      >
        <img src="/blur-shape.png" alt="" className="w-full h-full object-contain" aria-hidden="true" />
      </div>

      <div className="container max-w-5xl mx-auto px-6 relative z-10">
        {/* Section label */}
        <p className="text-white/40 text-sm tracking-[0.3em] uppercase mb-20">
          Our Services
        </p>

        {/* Service items */}
        <div className="space-y-24">
          {SERVICES.map((service) => (
            <div
              key={service.number}
              className="service-item grid md:grid-cols-12 gap-6 md:gap-12 items-start"
            >
              {/* Number */}
              <div className="md:col-span-2">
                <span className="service-number text-white/20 font-rustic text-6xl md:text-8xl leading-none block">
                  {service.number}
                </span>
              </div>

              {/* Content */}
              <div className="md:col-span-10 space-y-4">
                <div className="overflow-hidden">
                  <h3 className="service-title font-rustic text-white text-3xl md:text-5xl">
                    {service.title}
                  </h3>
                </div>
                <p className="service-desc text-white/50 text-lg md:text-xl leading-relaxed max-w-2xl">
                  {service.description}
                </p>
                <div className="service-line h-px bg-white/10 mt-8" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
