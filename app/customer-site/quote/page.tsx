'use client';

import { useState } from 'react';
import Link from 'next/link';
import { submitQuoteRequest } from './actions';

export default function QuotePage() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    category: '',
    address: '',
    description: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  const updateForm = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const categories = [
    'House Cleaning', 'Window Cleaning', 'Pressure Washing', 
    'Junk Removal', 'Lawn Care', 'Landscaping', 
    'Moving Services', 'Electrical', 'HVAC', 'Plumbing'
  ];

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await submitQuoteRequest(formData);
      if (res.success) {
        setIsSuccess(true);
      } else {
        setError(res.error || 'Failed to submit request');
      }
    } catch (e) {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#010A14] flex flex-col justify-center items-center py-20 px-6 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-green-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="w-full max-w-xl bg-[#001a36]/50 backdrop-blur-xl border border-white/10 rounded-3xl p-12 relative z-10 shadow-2xl text-center">
          <div className="h-20 w-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-rustic text-4xl text-white mb-4">Request Received</h1>
          <p className="text-white/60 text-lg mb-8">
            Your request has been successfully dispatched to our network. You will receive an update shortly.
          </p>
          <Link 
            href="/"
            className="inline-block bg-white text-[#010A14] px-8 py-3 rounded-full font-bold tracking-widest uppercase hover:scale-105 transition-transform"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#010A14] flex flex-col justify-center items-center py-20 px-6 relative">
      {/* Background flare */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-3xl bg-[#001a36]/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 relative z-10 shadow-2xl">
        <Link href="/" className="text-white/50 hover:text-white text-sm font-medium tracking-wide flex items-center gap-2 mb-8 transition-colors">
          &larr; Back to Home
        </Link>
        
        <h1 className="font-rustic text-4xl md:text-5xl text-white mb-2">Request a Quote</h1>
        <p className="text-white/60 text-lg mb-12">Tell us what you need and we&apos;ll dispatch a professional.</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-8">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="animate-[fadeIn_0.5s_ease-out]">
            <h2 className="text-xl text-white font-medium mb-6">1. Select a Service</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => updateForm('category', cat)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    formData.category === cat 
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
                disabled={!formData.category}
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
                  value={formData.address}
                  onChange={(e) => updateForm('address', e.target.value)}
                  placeholder="123 Main St, Toronto, ON"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Describe what needs to be done</label>
                <textarea 
                  rows={4}
                  value={formData.description}
                  onChange={(e) => updateForm('description', e.target.value)}
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
                disabled={!formData.address}
                onClick={() => setStep(3)}
                className="bg-white text-[#010A14] px-8 py-3 rounded-full font-bold tracking-widest uppercase hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
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
                  value={formData.firstName}
                  onChange={(e) => updateForm('firstName', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Last Name</label>
                <input 
                  type="text" 
                  value={formData.lastName}
                  onChange={(e) => updateForm('lastName', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Email Address</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => updateForm('email', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-2">Phone Number</label>
                <input 
                  type="tel" 
                  value={formData.phone}
                  onChange={(e) => updateForm('phone', e.target.value)}
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
                disabled={isSubmitting}
                className="text-white/60 hover:text-white transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.firstName || !formData.lastName || !formData.email || !formData.phone}
                className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold tracking-widest uppercase hover:bg-blue-500 transition-colors shadow-[0_0_20px_rgba(37,99,235,0.4)] disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : 'Submit Request'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
