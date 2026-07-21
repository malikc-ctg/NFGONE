'use client';

import { useEffect, useRef, useState } from 'react';

export function ScrollReveal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [isIn, setIsIn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || isIn) return;
    
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIn(true);
          io.disconnect();
        }
      },
      { threshold: 0, rootMargin: '0px 0px -50px 0px' }
    );
    
    io.observe(el);
    return () => io.disconnect();
  }, [isIn]);

  return (
    <div ref={ref} className={`sr ${className} ${isIn ? 'in' : ''}`}>
      {children}
    </div>
  );
}
