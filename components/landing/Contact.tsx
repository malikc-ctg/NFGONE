'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { useFadeIn, useLineReveal } from '@/lib/motion/hooks';

export function Contact() {
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useLineReveal(headlineRef, { stagger: 0.12 });
  useFadeIn(cardRef, { delay: 0.2, y: 40 });

  return (
    <section
      id="contact"
      className="relative py-32 md:py-48 overflow-hidden"
      style={{ backgroundColor: '#002c58' }}
    >
      <div className="container max-w-5xl mx-auto px-6 relative z-10">
        <p className="text-white/40 text-sm tracking-[0.3em] uppercase mb-12">
          Apply
        </p>

        <div className="grid md:grid-cols-10 gap-12 md:gap-16 items-center">
          {/* Left: Headline */}
          <div className="md:col-span-5">
            <h2
              ref={headlineRef}
              className="font-rustic text-white text-4xl md:text-6xl leading-snug"
            >
              Ready to join Ontario&apos;s trusted home service network?
            </h2>
            <p className="text-white/50 text-lg mt-6 leading-relaxed">
              Sea of Blue will expand into additional home service categories in future releases, including landscaping, lawn care, junk removal, handyman services, painting, plumbing, electrical, HVAC, and more.
            </p>
          </div>

          {/* Right: CTA Card */}
          <div ref={cardRef} className="md:col-span-5 md:col-start-7">
            <div className="bg-[#0B3D6E]/20 backdrop-blur border border-white/10 p-8 md:p-10 rounded-lg flex flex-col gap-6">
              <h3 className="font-rustic text-white text-2xl tracking-wide">
                Join the Provider Network
              </h3>
              <p className="text-white/70 leading-relaxed text-sm md:text-base">
                We are currently accepting applications for cleaning teams and home service professionals.
              </p>
              
              <ul className="space-y-3 my-2">
                {[
                  'Zero cost per lead — keep 100% of job earnings',
                  'Direct booking & dispatch support',
                  'Set your own flexible schedule & volume',
                ].map((highlight) => (
                  <li key={highlight} className="flex items-start gap-2 text-white/60 text-sm">
                    <span className="text-white/80 select-none">✓</span>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-2">
                <Link
                  href="/apply"
                  className="group relative overflow-hidden bg-white text-[#001a36] px-12 py-4 text-sm tracking-[0.25em] uppercase font-medium hover:bg-white/90 transition-colors focus:outline-none focus:ring-2 focus:ring-white/60 inline-block text-center w-full"
                >
                  <span className="block relative">
                    <span className="block transition-transform duration-500 group-hover:-translate-y-full">
                      Apply Now
                    </span>
                    <span className="block absolute inset-0 flex items-center justify-center transition-transform duration-500 translate-y-full group-hover:translate-y-0">
                      Apply Now
                    </span>
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
