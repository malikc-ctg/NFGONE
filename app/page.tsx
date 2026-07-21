'use client';

import { Hero } from '@/components/landing/Hero';
import { BrandStatement } from '@/components/landing/BrandStatement';
import { Services } from '@/components/landing/Services';
import { KineticTypography } from '@/components/landing/KineticTypography';
import { EmployeeComparison } from '@/components/landing/EmployeeComparison';
import { Contact } from '@/components/landing/Contact';
import { Navigation } from '@/components/landing/Navigation';
import { Footer } from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <main className="bg-[#001a36] min-h-screen text-white overflow-hidden selection:bg-white/20">
      {/* Main Experience */}
      <Navigation />
      <Hero />
      <BrandStatement />
      <Services />
      <KineticTypography />
      <EmployeeComparison />
      <Contact />
      <Footer />
    </main>
  );
}
