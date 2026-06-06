'use client';

import { useRef } from 'react';
import { useReducedMotion } from '@/lib/motion/hooks';

interface StartGateProps {
  onStart: () => void;
}

export function StartGate({ onStart }: StartGateProps) {
  const reduced = useReducedMotion();
  const gateRef = useRef<HTMLDivElement>(null);

  const handleStart = () => {
    if (gateRef.current) {
      gateRef.current.style.transition = 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
      gateRef.current.style.opacity = '0';
      gateRef.current.style.pointerEvents = 'none';
      setTimeout(() => {
        onStart();
      }, 850);
    }
  };

  // Auto-dismiss for reduced motion
  if (reduced) {
    // We'll trigger onStart immediately via useEffect in parent
    return null;
  }

  return (
    <div
      ref={gateRef}
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center"
      style={{ backgroundColor: '#001a36' }}
    >
      {/* Background subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#002c58]/30 to-transparent" />

      {/* Welcome text */}
      <div className="relative z-10 text-center space-y-8">
        <div className="overflow-hidden">
          <h2 className="font-rustic text-white text-4xl md:text-6xl lg:text-7xl tracking-tight">
            Welcome to
          </h2>
        </div>
        <div className="overflow-hidden">
          <h2 className="font-rustic text-white text-4xl md:text-6xl lg:text-7xl tracking-tight">
            Sea of Blue
          </h2>
        </div>

        {/* CTA with doubled-label hover swap */}
        <div className="pt-8">
          <button
            onClick={handleStart}
            className="text-mask-btn group relative overflow-hidden border border-white/30 text-white px-10 py-4 text-sm tracking-[0.25em] uppercase hover:bg-white hover:text-[#001a36] transition-colors duration-500 focus:outline-none focus:ring-2 focus:ring-white/60 rounded-none"
            aria-label="Start the experience"
          >
            <span className="text-mask-inner block">
              <span className="block transition-transform duration-500 group-hover:-translate-y-full">
                START THE EXPERIENCE
              </span>
              <span className="block absolute inset-0 flex items-center justify-center transition-transform duration-500 translate-y-full group-hover:translate-y-0">
                START THE EXPERIENCE
              </span>
            </span>
          </button>
        </div>

        {/* Sound toggle (stubbed) */}
        <div className="pt-4">
          <button
            className="text-white/30 text-xs tracking-widest uppercase hover:text-white/60 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 rounded px-3 py-2 flex items-center gap-2 mx-auto"
            aria-label="Toggle sound (disabled)"
            disabled
          >
            <span className="flex gap-[2px]">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className="w-[2px] h-3 bg-white/30 rounded-full"
                  style={{ height: `${8 + Math.random() * 8}px` }}
                />
              ))}
            </span>
            <span>Sound</span>
          </button>
        </div>
      </div>
    </div>
  );
}
