'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap, ScrollTrigger, EASE, DURATION } from './index';

// ── Reduced Motion Detection ──
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduced;
}

// ── Line Reveal Hook ──
export function useLineReveal(
  ref: React.RefObject<HTMLElement | null>,
  options?: {
    delay?: number;
    stagger?: number;
    duration?: number;
    scrub?: boolean | number;
    triggerStart?: string;
  }
) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || !ref.current) return;

    // Dynamically import split-type to avoid SSR issues
    let ctx: gsap.Context | undefined;

    import('split-type').then(({ default: SplitType }) => {
      if (!ref.current) return;

      const split = new SplitType(ref.current, { types: 'lines' });
      const lines = split.lines;
      if (!lines || lines.length === 0) return;

      // Wrap each line in a clip container
      lines.forEach((line) => {
        const wrapper = document.createElement('div');
        wrapper.style.overflow = 'hidden';
        wrapper.style.display = 'block';
        line.parentNode?.insertBefore(wrapper, line);
        wrapper.appendChild(line);
      });

      gsap.set(lines, { yPercent: 110 });

      const scrollConfig = options?.scrub
        ? {
            scrollTrigger: {
              trigger: ref.current,
              start: options?.triggerStart || 'top 85%',
              end: 'top 40%',
              scrub: typeof options.scrub === 'number' ? options.scrub : 1,
            },
          }
        : {
            scrollTrigger: {
              trigger: ref.current,
              start: options?.triggerStart || 'top 85%',
              toggleActions: 'play none none none',
            },
          };

      ctx = gsap.context(() => {
        gsap.to(lines, {
          yPercent: 0,
          duration: options?.duration || DURATION.HEADLINE,
          stagger: options?.stagger || 0.12,
          ease: EASE.ENTRANCE,
          delay: options?.delay || 0,
          ...scrollConfig,
        });
      }, ref.current);
    });

    return () => {
      ctx?.revert();
    };
  }, [ref, reduced, options?.delay, options?.stagger, options?.duration, options?.scrub, options?.triggerStart]);
}

// ── Word Reveal Hook ──
export function useWordReveal(
  ref: React.RefObject<HTMLElement | null>,
  options?: {
    delay?: number;
    stagger?: number;
    duration?: number;
    scrub?: boolean | number;
  }
) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || !ref.current) return;

    let ctx: gsap.Context | undefined;

    import('split-type').then(({ default: SplitType }) => {
      if (!ref.current) return;

      const split = new SplitType(ref.current, { types: 'words' });
      const words = split.words;
      if (!words || words.length === 0) return;

      gsap.set(words, { opacity: 0.15 });

      const scrollConfig = options?.scrub
        ? {
            scrollTrigger: {
              trigger: ref.current,
              start: 'top 80%',
              end: 'top 20%',
              scrub: typeof options.scrub === 'number' ? options.scrub : 1,
            },
          }
        : {
            scrollTrigger: {
              trigger: ref.current,
              start: 'top 80%',
              toggleActions: 'play none none none',
            },
          };

      ctx = gsap.context(() => {
        gsap.to(words, {
          opacity: 1,
          duration: options?.duration || 0.6,
          stagger: options?.stagger || 0.04,
          ease: EASE.UI,
          delay: options?.delay || 0,
          ...scrollConfig,
        });
      }, ref.current);
    });

    return () => {
      ctx?.revert();
    };
  }, [ref, reduced, options?.delay, options?.stagger, options?.duration, options?.scrub]);
}

// ── Parallax Layer Hook ──
export function useParallaxLayer(
  ref: React.RefObject<HTMLElement | null>,
  speed: number = 0.3
) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || !ref.current) return;

    const ctx = gsap.context(() => {
      gsap.to(ref.current, {
        yPercent: speed * 100,
        ease: 'none',
        scrollTrigger: {
          trigger: ref.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });
    }, ref.current);

    return () => ctx.revert();
  }, [ref, speed, reduced]);
}

// ── Mouse Parallax Hook ──
export function useMouseParallax(
  ref: React.RefObject<HTMLElement | null>,
  intensity: number = 15
) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || !ref.current) return;

    // Detect touch device — disable mouse parallax
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch) return;

    const el = ref.current;

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;

      const xOffset = ((clientX / innerWidth) - 0.5) * intensity * 2;
      const yOffset = ((clientY / innerHeight) - 0.5) * intensity * 2;

      gsap.to(el, {
        x: xOffset,
        y: yOffset,
        duration: 0.8,
        ease: EASE.UI,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [ref, intensity, reduced]);
}

// ── Fade In On Scroll Hook ──
export function useFadeIn(
  ref: React.RefObject<HTMLElement | null>,
  options?: {
    delay?: number;
    duration?: number;
    y?: number;
  }
) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || !ref.current) return;

    gsap.set(ref.current, { opacity: 0, y: options?.y || 40 });

    const ctx = gsap.context(() => {
      gsap.to(ref.current, {
        opacity: 1,
        y: 0,
        duration: options?.duration || DURATION.SECTION,
        ease: EASE.ENTRANCE,
        delay: options?.delay || 0,
        scrollTrigger: {
          trigger: ref.current,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      });
    }, ref.current);

    return () => ctx.revert();
  }, [ref, reduced, options?.delay, options?.duration, options?.y]);
}
