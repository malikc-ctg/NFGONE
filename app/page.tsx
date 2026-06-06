'use client';

import { useState } from 'react';
import { Preloader } from '@/components/landing/Preloader';
import { StartGate } from '@/components/landing/StartGate';
import { Hero } from '@/components/landing/Hero';
import { BrandStatement } from '@/components/landing/BrandStatement';
import { Services } from '@/components/landing/Services';
import { KineticTypography } from '@/components/landing/KineticTypography';
import { Testimonials } from '@/components/landing/Testimonials';
import { Contact } from '@/components/landing/Contact';
import { Navigation } from '@/components/landing/Navigation';
import { Footer } from '@/components/landing/Footer';
import { useLenis } from '@/lib/motion/LenisProvider';

export default function LandingPage() {
  const [preloaderDone, setPreloaderDone] = useState(false);
  const [gateDismissed, setGateDismissed] = useState(false);
  const { startScroll } = useLenis();

  const handleStart = () => {
    setGateDismissed(true);
    startScroll();
  };

  return (
    <main className="bg-[#001a36] min-h-screen text-white overflow-hidden selection:bg-white/20">
      {/* 1. Preloader */}
      {!preloaderDone && (
        <Preloader onComplete={() => setPreloaderDone(true)} />
      )}

      {/* 2. Start Gate (shows after preloader) */}
      {preloaderDone && !gateDismissed && (
        <StartGate onStart={handleStart} />
      )}

      {/* 3. Main Experience (visible underneath gate) */}
      <Navigation />
      <Hero />
      <BrandStatement />
      <Services />
      <KineticTypography />
      <Testimonials />
      <Contact />
      <Footer />
    </main>
  );
}
