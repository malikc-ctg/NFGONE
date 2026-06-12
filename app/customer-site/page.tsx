'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { useFadeIn, useLineReveal } from '@/lib/motion/hooks';
import { gsap } from '@/lib/motion/index';

export default function CustomerLandingPage() {
  const heroRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);

  useFadeIn(headlineRef, { delay: 0.2, duration: 1.2, y: 30 });
  useLineReveal(subRef, { delay: 0.6, duration: 1.0 });

  useEffect(() => {
    // Basic reveal animations for all sections
    const sections = document.querySelectorAll('.reveal-section');
    sections.forEach((sec) => {
      gsap.fromTo(
        sec,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: sec,
            start: 'top 85%',
          },
        }
      );
    });
  }, []);

  return (
    <div className="w-full">
      
      {/* SECTION 1: HERO */}
      <section 
        ref={heroRef}
        className="relative min-h-[90vh] flex flex-col items-center justify-center pt-20 px-6 text-center"
      >
        <div className="absolute inset-0 bg-[#001a36] z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,40,80,0.5)_0%,transparent_70%)]" />
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto">
          <h1 ref={headlineRef} className="font-rustic text-6xl md:text-8xl lg:text-9xl tracking-tight mb-8">
            Home Services, <br />
            <span className="text-white/80">Dispatched.</span>
          </h1>
          
          <div ref={subRef} className="text-lg md:text-2xl text-white/60 font-light max-w-2xl mx-auto leading-relaxed mb-12">
            <p>Sea of Blue connects homeowners with vetted local professionals through a modern dispatch platform built for speed, transparency, and quality.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 opacity-0 animate-[fadeIn_1s_ease-out_1s_forwards]">
            <Link href="/quote" className="w-full sm:w-auto bg-white text-[#001a36] px-8 py-4 rounded-full font-bold text-sm tracking-wide uppercase hover:bg-white/90 transition-transform hover:scale-105">
              Get a Quote
            </Link>
            <Link href="/quote" className="w-full sm:w-auto border border-white/20 text-white px-8 py-4 rounded-full font-bold text-sm tracking-wide uppercase hover:bg-white/5 transition-colors">
              Book a Service
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 border-t border-white/10 pt-10 text-left md:text-center opacity-0 animate-[fadeIn_1s_ease-out_1.5s_forwards]">
            <div>
              <div className="text-white font-bold text-lg">Vetted</div>
              <div className="text-white/50 text-sm">Professionals</div>
            </div>
            <div>
              <div className="text-white font-bold text-lg">Live</div>
              <div className="text-white/50 text-sm">Dispatching</div>
            </div>
            <div>
              <div className="text-white font-bold text-lg">Real-Time</div>
              <div className="text-white/50 text-sm">Updates</div>
            </div>
            <div>
              <div className="text-white font-bold text-lg">Ontario</div>
              <div className="text-white/50 text-sm">Based</div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: HOW IT WORKS */}
      <section className="reveal-section py-32 bg-[#010A14] border-t border-white/5 relative z-10">
        <div className="container max-w-6xl mx-auto px-6">
          <h2 className="font-rustic text-4xl md:text-6xl mb-20 text-center">A Better Way To Book Home Services</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Request Service', desc: 'Tell us what you need and when you need it.' },
              { step: '02', title: 'We Dispatch', desc: 'Our system matches your job with qualified professionals in your area.' },
              { step: '03', title: 'Track Progress', desc: 'Receive updates from booking through completion.' },
              { step: '04', title: 'Job Complete', desc: 'The work gets done and you stay informed every step of the way.' }
            ].map((item) => (
              <div key={item.step} className="border border-white/10 p-8 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors">
                <div className="text-blue-500 font-rustic text-4xl mb-4">{item.step}</div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3: THE DISPATCH DIFFERENCE */}
      <section className="reveal-section py-32 bg-[#001a36] relative z-10">
        <div className="container max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-rustic text-5xl md:text-7xl mb-12">Why Sea of Blue Exists</h2>
          <div className="space-y-6 text-lg md:text-2xl text-white/70 font-light leading-relaxed">
            <p>Most service platforms generate leads and leave the rest up to chance.</p>
            <p className="text-white font-medium">Sea of Blue was built differently.</p>
            <p>Every job enters a centralized dispatch system where professionals are matched, tracked, and managed through a dedicated operations platform.</p>
            <p>That means faster response times, better communication, and greater accountability from start to finish.</p>
          </div>
        </div>
      </section>

      {/* SECTION 4: SERVICES */}
      <section id="services" className="reveal-section py-32 bg-[#010A14] border-t border-white/5 relative z-10">
        <div className="container max-w-6xl mx-auto px-6">
          <h2 className="font-rustic text-4xl md:text-6xl mb-16">Services Available Through The Network</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {['House Cleaning', 'Window Cleaning', 'Pressure Washing', 'Junk Removal', 'Lawn Care', 'Landscaping', 'Moving Services', 'Electrical', 'HVAC', 'Plumbing'].map((service) => (
              <div key={service} className="p-6 border border-white/10 rounded-xl bg-white/5 flex items-center justify-center text-center hover:border-white/30 transition-colors">
                <span className="font-medium text-white/90">{service}</span>
              </div>
            ))}
            <div className="p-6 border border-transparent rounded-xl flex items-center justify-center text-center">
              <span className="font-medium text-white/40 italic">And More</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: REAL-TIME VISIBILITY */}
      <section className="reveal-section py-32 bg-[#001a36] border-t border-white/5 relative z-10">
        <div className="container max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="font-rustic text-5xl md:text-6xl mb-8">Know What&apos;s Happening</h2>
            <div className="space-y-4 text-xl text-white/70 mb-10">
              <p>No wondering.</p>
              <p>No chasing contractors.</p>
              <p>No waiting for callbacks.</p>
              <p className="text-white font-medium mt-8">Receive updates as your job progresses and stay informed from dispatch to completion.</p>
            </div>
          </div>
          <div className="bg-[#010A14] p-10 rounded-3xl border border-white/10">
            <ul className="space-y-6">
              {[
                'Booking Confirmations',
                'Dispatch Updates',
                'Arrival Notifications',
                'Job Completion Updates'
              ].map((bullet, i) => (
                <li key={i} className="flex items-center gap-4 text-lg">
                  <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* SECTION 6: QUALITY STANDARDS */}
      <section className="reveal-section py-32 bg-[#010A14] relative z-10">
        <div className="container max-w-6xl mx-auto px-6">
          <div className="max-w-3xl mb-16">
            <h2 className="font-rustic text-4xl md:text-6xl mb-8">Every Professional Must Meet Network Standards</h2>
            <p className="text-xl text-white/70">Sea of Blue works with independent professionals and service companies that meet our onboarding requirements.</p>
            <p className="text-lg text-white/50 mt-4">Standards may include:</p>
          </div>
          <div className="flex flex-wrap gap-4">
            {['Business Verification', 'Insurance Verification', 'Service History Review', 'Identity Verification', 'Performance Monitoring'].map((std) => (
              <div key={std} className="px-6 py-3 rounded-full border border-white/20 bg-white/5 text-sm font-medium tracking-wide">
                {std}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 7: COVERAGE AREA */}
      <section id="coverage" className="reveal-section py-32 bg-[#001a36] relative z-10 border-t border-white/5">
        <div className="container max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-rustic text-4xl md:text-6xl mb-8">Currently Serving Ontario</h2>
          <p className="text-xl text-white/70 mb-4">Sea of Blue is currently expanding across Ontario.</p>
          <p className="text-lg text-white/50 mb-12">Service availability varies by location and category.</p>
          <Link href="/quote" className="inline-block border-2 border-white text-white px-8 py-4 rounded-full font-bold text-sm tracking-wide uppercase hover:bg-white hover:text-[#001a36] transition-colors">
            Check Availability
          </Link>
        </div>
      </section>

      {/* SECTION 8: BETA BANNER */}
      <section className="reveal-section py-16 bg-blue-600 relative z-10 text-center px-6">
        <h3 className="font-bold tracking-widest uppercase text-sm mb-4 text-white/80">Currently In Private Beta</h3>
        <p className="text-xl max-w-3xl mx-auto font-medium">Sea of Blue is currently operating in private beta while we expand our professional network and service coverage. Availability is limited and services may vary by region.</p>
      </section>

      {/* SECTION 9: FINAL CTA */}
      <section className="reveal-section py-40 bg-[#010A14] relative z-10 text-center px-6">
        <h2 className="font-rustic text-5xl md:text-7xl mb-8">Need Something Done?</h2>
        <p className="text-xl text-white/60 mb-12 max-w-2xl mx-auto">Submit a request and we&apos;ll connect your job with professionals in your area.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/quote" className="w-full sm:w-auto bg-white text-[#010A14] px-10 py-5 rounded-full font-bold tracking-widest uppercase hover:scale-105 transition-transform shadow-xl">
            Request Service
          </Link>
          <Link href="/quote" className="w-full sm:w-auto border border-white/20 text-white px-10 py-5 rounded-full font-bold tracking-widest uppercase hover:bg-white/5 transition-colors">
            Check Availability
          </Link>
        </div>
      </section>

    </div>
  );
}
