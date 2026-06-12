'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function QuotePage() {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState('');

  const categories = [
    'House Cleaning', 'Window Cleaning', 'Pressure Washing', 
    'Junk Removal', 'Lawn Care', 'Landscaping', 
    'Moving Services', 'Electrical', 'HVAC', 'Plumbing'
  ];

  return (
    <div className="min-h-screen bg-[#010A14] flex flex-col justify-center items-center py-20 px-6 relative">
      {/* Background flare */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-3xl bg-[#001a36]/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 relative z-10 shadow-2xl">
        <Link href="/customer-site" className="text-white/50 hover:text-white text-sm font-medium tracking-wide flex items-center gap-2 mb-8 transition-colors">
          &larr; Back to Home
        </Link>
        
        <h1 className="font-rustic text-4xl md:text-5xl text-white mb-2">Request a Quote</h1>
        <p className="text-white/60 text-lg mb-12">Tell us what you need and we&apos;ll dispatch a professional.</p>

        {step === 1 && (
          <div className="animate-[fadeIn_0.5s_ease-out]">
            <h2 className="text-xl text-white font-medium mb-6">1. Select a Service</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    category === cat 
                      ? 'border-blue-500 bg-blue-500/20 text-white' 
                      : 'border-white/10 bg-white/5 text-white/70 hover:border-white/30 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="mt-10 flex justify-end">
              <button 
                disabled={!category}
                onClick={() => setStep(2)}
                className="bg-white text-[#010A14] px-8 py-3 rounded-full font-bold tracking-widest uppercase hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-[fadeIn_0.5s_ease-out]">
            <h2 className="text-xl text-white font-medium mb-6">2. Job Details</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-white/70 text-sm mb-2">Service Address (Ontario only)</label>
                <input 
                  type="text" 
                  placeholder="123 Main St, Toronto, ON"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Describe what needs to be done</label>
                <textarea 
                  rows={4}
                  placeholder="e.g. Deep clean of a 3-bedroom house before move-in."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>
            </div>
            <div className="mt-10 flex justify-between items-center">
              <button 
                onClick={() => setStep(1)}
                className="text-white/60 hover:text-white transition-colors"
              >
                Back
              </button>
              <button 
                onClick={() => setStep(3)}
                className="bg-white text-[#010A14] px-8 py-3 rounded-full font-bold tracking-widest uppercase hover:scale-105 transition-transform"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-[fadeIn_0.5s_ease-out]">
            <h2 className="text-xl text-white font-medium mb-6">3. Your Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-white/70 text-sm mb-2">First Name</label>
                <input 
                  type="text" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Last Name</label>
                <input 
                  type="text" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Email Address</label>
                <input 
                  type="email" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Phone Number</label>
                <input 
                  type="tel" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
            
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-10 flex gap-4 items-start">
              <div className="h-2 w-2 rounded-full bg-blue-500 mt-2 shrink-0 animate-pulse" />
              <p className="text-sm text-blue-200">
                By submitting this request, your job will be processed by our dispatch system and connected with a verified professional in your area.
              </p>
            </div>

            <div className="flex justify-between items-center">
              <button 
                onClick={() => setStep(2)}
                className="text-white/60 hover:text-white transition-colors"
              >
                Back
              </button>
              <button 
                className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold tracking-widest uppercase hover:bg-blue-500 transition-colors shadow-[0_0_20px_rgba(37,99,235,0.4)]"
              >
                Submit Request
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
