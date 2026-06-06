import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// ── Easing Constants ──
export const EASE = {
  /** Long buoyant entrance — the signature underwater feel */
  ENTRANCE: 'power3.out',
  /** Custom cubic-bezier for premium motion */
  BUOYANT: 'cubic-bezier(0.16, 1, 0.3, 1)',
  /** Slightly faster for UI interactions */
  UI: 'power2.out',
} as const;

// ── Duration Constants ──
export const DURATION = {
  /** Headline reveals */
  HEADLINE: 1.2,
  /** Section transitions */
  SECTION: 0.9,
  /** Fast UI feedback */
  UI: 0.4,
  /** Preloader wipe */
  PRELOADER_WIPE: 0.9,
  /** Gate fade */
  GATE_FADE: 0.8,
} as const;

// ── Lenis Setup ──
let lenisInstance: Lenis | null = null;

export function initLenis(): Lenis {
  if (lenisInstance) return lenisInstance;

  lenisInstance = new Lenis({
    duration: 1.2,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    touchMultiplier: 2,
    infinite: false,
  });

  // Wire Lenis to GSAP ticker
  lenisInstance.on('scroll', ScrollTrigger.update);

  gsap.ticker.add((time: number) => {
    lenisInstance?.raf(time * 1000);
  });

  gsap.ticker.lagSmoothing(0);

  return lenisInstance;
}

export function getLenis(): Lenis | null {
  return lenisInstance;
}

export function destroyLenis(): void {
  if (lenisInstance) {
    gsap.ticker.remove((time: number) => {
      lenisInstance?.raf(time * 1000);
    });
    lenisInstance.destroy();
    lenisInstance = null;
  }
}

// ── GSAP Context Helper ──
export function createGSAPContext(
  scope: React.RefObject<HTMLElement | null>,
  callback: (self: gsap.Context) => void
): gsap.Context {
  return gsap.context(callback, scope.current || undefined);
}

// ── Cleanup ──
export function killAllScrollTriggers(): void {
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
}

export { gsap, ScrollTrigger, Lenis };
