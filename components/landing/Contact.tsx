'use client';

import { useRef, useState } from 'react';
import { useFadeIn, useLineReveal } from '@/lib/motion/hooks';

export function Contact() {
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [formState, setFormState] = useState({ name: '', email: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useLineReveal(headlineRef, { stagger: 0.12 });
  useFadeIn(formRef, { delay: 0.2, y: 40 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    // TODO: Wire to existing contact endpoint if one exists
    await new Promise((r) => setTimeout(r, 1000));
    setSent(true);
    setSending(false);
  };

  return (
    <section
      id="contact"
      className="relative py-32 md:py-48 overflow-hidden"
      style={{ backgroundColor: '#002c58' }}
    >
      <div className="container max-w-5xl mx-auto px-6 relative z-10">
        <p className="text-white/40 text-sm tracking-[0.3em] uppercase mb-12">
          Contact
        </p>

        <div className="grid md:grid-cols-10 gap-12 md:gap-16">
          {/* Left: Headline */}
          <div className="md:col-span-5">
            <h2
              ref={headlineRef}
              className="font-rustic text-white text-4xl md:text-6xl leading-snug"
            >
              Ready to join Ontario&apos;s trusted home service network?
            </h2>
            <p className="text-white/50 text-lg mt-6 leading-relaxed">
              Sea of Blue will expand into additional home service categories in future releases, including landscaping, lawn care, junk removal, handyman services, painting, plumbing, electrical, HVAC, and more.
            </p>
          </div>

          {/* Right: Form */}
          <div ref={formRef} className="md:col-span-5 md:col-start-7">
            {sent ? (
              <div className="text-center py-12">
                <p className="text-white text-2xl font-rustic mb-4">Message Sent</p>
                <p className="text-white/50">We&apos;ll be in touch shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                <div>
                  <label className="text-white/60 text-sm block mb-2">Name</label>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={formState.name}
                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                    required
                    className="w-full bg-transparent border-b border-white/20 text-white pb-3 text-lg focus:outline-none focus:border-white/60 transition-colors placeholder:text-white/20"
                  />
                </div>
                <div>
                  <label className="text-white/60 text-sm block mb-2">Email</label>
                  <input
                    type="email"
                    placeholder="Your email"
                    value={formState.email}
                    onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                    required
                    className="w-full bg-transparent border-b border-white/20 text-white pb-3 text-lg focus:outline-none focus:border-white/60 transition-colors placeholder:text-white/20"
                  />
                </div>
                <div>
                  <label className="text-white/60 text-sm block mb-2">Message</label>
                  <input
                    type="text"
                    placeholder="Your message"
                    value={formState.message}
                    onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                    required
                    className="w-full bg-transparent border-b border-white/20 text-white pb-3 text-lg focus:outline-none focus:border-white/60 transition-colors placeholder:text-white/20"
                  />
                </div>

                {/* SEND button with doubled-label swap */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={sending}
                    className="group relative overflow-hidden bg-white text-[#001a36] px-12 py-4 text-sm tracking-[0.25em] uppercase font-medium hover:bg-white/90 transition-colors focus:outline-none focus:ring-2 focus:ring-white/60 disabled:opacity-50"
                  >
                    <span className="block">
                      <span className="block transition-transform duration-500 group-hover:-translate-y-full">
                        {sending ? 'SENDING...' : 'SEND'}
                      </span>
                      <span className="block absolute inset-0 flex items-center justify-center transition-transform duration-500 translate-y-full group-hover:translate-y-0">
                        {sending ? 'SENDING...' : 'SEND'}
                      </span>
                    </span>
                  </button>
                </div>

                {/* Reassurance */}
                <p className="text-white/30 text-sm mt-4">
                  {/* TODO: Replace with real reassurance copy */}
                  We&apos;ll be in touch shortly.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
