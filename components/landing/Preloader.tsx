'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useReducedMotion } from '@/lib/motion/hooks';

interface PreloaderProps {
  onComplete: () => void;
}

export function Preloader({ onComplete }: PreloaderProps) {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      // Skip preloader entirely
      setIsVisible(false);
      onComplete();
      return;
    }

    // Animate progress 0→100 over ~2.2s
    const duration = 2200;
    const start = Date.now();

    const tick = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(Math.round(eased * 100));

      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        // Wipe reveal
        setTimeout(() => {
          if (overlayRef.current) {
            overlayRef.current.style.transition = 'clip-path 0.9s cubic-bezier(0.16, 1, 0.3, 1)';
            overlayRef.current.style.clipPath = 'inset(0 0 100% 0)';
          }
          setTimeout(() => {
            setIsVisible(false);
            onComplete();
          }, 950);
        }, 300);
      }
    };

    requestAnimationFrame(tick);
  }, [onComplete, reduced]);

  if (!isVisible) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{
        backgroundColor: '#001a36',
        clipPath: 'inset(0 0 0 0)',
      }}
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* Caustics shimmer background */}
      <div className="absolute inset-0 caustics-shimmer opacity-20" />

      {/* Logo */}
      <div className="relative z-10 mb-8">
        <Image
          src="/logo.png"
          alt="Sea of Blue"
          width={120}
          height={120}
          priority
          className="opacity-90"
        />
      </div>

      {/* Brand name */}
      <p className="font-rustic text-white/60 text-lg tracking-[0.3em] uppercase mb-4">
        Sea of Blue
      </p>

      {/* Progress counter */}
      <div className="absolute bottom-8 right-8">
        <span className="font-mono text-white/50 text-sm tabular-nums">
          {String(progress).padStart(2, '0')}%
        </span>
      </div>

      {/* Loading text */}
      <p className="text-white/30 text-sm tracking-widest uppercase">
        Loading experience
      </p>

      {/* Skip button for accessibility */}
      <button
        onClick={() => {
          setIsVisible(false);
          onComplete();
        }}
        className="absolute bottom-8 left-8 text-white/30 text-xs hover:text-white/60 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 rounded px-2 py-1"
        aria-label="Skip preloader"
      >
        Skip
      </button>
    </div>
  );
}
