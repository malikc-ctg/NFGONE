'use client';

import { useRef } from 'react';
import { useFadeIn } from '@/lib/motion/hooks';

export function Testimonials() {
  const cardRef = useRef<HTMLDivElement>(null);
  useFadeIn(cardRef, { y: 60 });

  return (
    <section
      id="testimonials"
      className="relative py-32 md:py-48 overflow-hidden"
      style={{ backgroundColor: '#001a36' }}
    >
      <div className="container max-w-5xl mx-auto px-6 relative z-10">
        <p className="text-white/40 text-sm tracking-[0.3em] uppercase mb-16">
          What They Say
        </p>

        {/* TODO: Replace with real Sea of Blue testimonials */}
        <div ref={cardRef} className="grid md:grid-cols-2 gap-12 items-start">
          {/* Photo placeholder */}
          <div className="aspect-[4/5] bg-white/5 rounded-sm overflow-hidden flex items-center justify-center">
            <span className="text-white/20 text-sm tracking-widest uppercase">
              Client Photo
            </span>
          </div>

          {/* Quote */}
          <div className="space-y-6">
            <h2 className="font-rustic text-white text-3xl md:text-5xl leading-snug">
              &ldquo;TODO: Add real customer testimonial here.&rdquo;
            </h2>
            <p className="text-white/50 text-lg leading-relaxed">
              TODO: Add supporting quote detail.
            </p>
            <div className="pt-4">
              <p className="text-white text-lg">Customer Name</p>
              <p className="text-white/40 text-sm">Location, Ontario</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
