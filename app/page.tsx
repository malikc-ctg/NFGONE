'use client';

import { useState } from 'react';
import { Preloader } from '@/components/landing/Preloader';
import { Hero } from '@/components/landing/Hero';
import { BrandStatement } from '@/components/landing/BrandStatement';
import { Services } from '@/components/landing/Services';
import { KineticTypography } from '@/components/landing/KineticTypography';
import { ContractorComparison } from '@/components/landing/ContractorComparison';
import { Contact } from '@/components/landing/Contact';
import { Navigation } from '@/components/landing/Navigation';
import { Footer } from '@/components/landing/Footer';
import { useLenis } from '@/lib/motion/LenisProvider';

export default function LandingPage() {
  const [preloaderDone, setPreloaderDone] = useState(false);
  const { startScroll } = useLenis();

  const handlePreloaderComplete = () => {
    setPreloaderDone(true);
    startScroll();
  };

  return (
    <main className="bg-[#001a36] min-h-screen text-white overflow-hidden selection:bg-white/20">
      {/* 1. Preloader */}
      {!preloaderDone && (
        <Preloader onComplete={handlePreloaderComplete} />
      )}

      {/* Main Experience */}
      <Navigation />
      <Hero />
      <BrandStatement />
      <Services />
      <KineticTypography />
      <ContractorComparison />
      <Contact />
      <Footer />
    </main>
  );
}
