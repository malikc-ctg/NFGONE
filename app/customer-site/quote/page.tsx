'use client';

import { useState } from 'react';
import Link from 'next/link';
import { submitQuoteRequest, getLiveQuote } from './actions';

export default function QuotePage() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quoteData, setQuoteData] = useState<any>(null);

  const [formData, setFormData] = useState({
    category: '',
    address: '',
    description: '',
    home_bedrooms: 2,
    home_bathrooms: 1,
    has_pets: false,
    scheduled_date: '',
    scheduled_window: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  const updateForm = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const categories = [
    'House Cleaning', 'Window Cleaning', 'Pressure Washing', 
    'Junk Removal', 'Lawn Care', 'Landscaping', 
    'Moving Services', 'Electrical', 'HVAC', 'Plumbing'
  ];

  const windows = [
    { id: 'morning', label: 'Morning (8am - 12pm)' },
    { id: 'afternoon', label: 'Afternoon (12pm - 4pm)' },
    { id: 'evening', label: 'Evening (4pm - 8pm)' }
  ];

  const handleGenerateQuote = async () => {
    setIsGeneratingQuote(true);
    setError(null);
    try {
      // service_type mapping
      let service_type = 'standard_clean';
      if (formData.category !== 'House Cleaning') {
        // Fallback for non-cleaning (dynamic pricing might fail if not configured)
        service_type = formData.category.toLowerCase().replace(/ /g, '_');
      }

      const res = await getLiveQuote({
        service_type,
        scheduled_date: formData.scheduled_date,
        scheduled_window: formData.scheduled_window,
        home_bedrooms: formData.home_bedrooms,
        home_bathrooms: formData.home_bathrooms,
        has_pets: formData.has_pets,
        add_ons: []
      });

      if (res.success && res.quote) {
        setQuoteData(res.quote);
        setStep(3);
      } else {
        setError(res.error || 'Failed to generate quote. Please ensure we service your area and category.');
      }
    } catch (e) {
      setError('An unexpected error occurred generating your quote.');
    } finally {
      setIsGeneratingQuote(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await submitQuoteRequest({
        ...formData,
        quoted_price: quoteData?.base_quote?.final_price,
      });
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
    <div className="min-h-screen bg-[#010A14] flex flex-col justify-center items-center py-20 px-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-3xl bg-[#001a36]/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 relative z-10 shadow-2xl">
        <Link href="/" className="text-white/50 hover:text-white text-sm font-medium tracking-wide flex items-center gap-2 mb-8 transition-colors">
          &larr; Back to Home
        </Link>
        
        <div className="flex justify-between items-end mb-12 border-b border-white/10 pb-6">
          <div>
            <h1 className="font-rustic text-4xl md:text-5xl text-white mb-2">Request a Quote</h1>
            <p className="text-white/60 text-lg">Instant pricing & live dispatching.</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm font-bold tracking-widest uppercase">
            <span className={step >= 1 ? 'text-blue-500' : 'text-white/20'}>1</span>
            <span className="text-white/20">-</span>
            <span className={step >= 2 ? 'text-blue-500' : 'text-white/20'}>2</span>
            <span className="text-white/20">-</span>
            <span className={step >= 3 ? 'text-blue-500' : 'text-white/20'}>3</span>
            <span className="text-white/20">-</span>
            <span className={step >= 4 ? 'text-blue-500' : 'text-white/20'}>4</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-8 text-sm">
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
                      ? 'border-blue-500 bg-blue-500/20 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
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
            
            <div className="space-y-8">
              {/* Address */}
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

              {/* Specs (If Cleaning) */}
              {formData.category === 'House Cleaning' && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Bedrooms</label>
                    <input 
                      type="number" min="0" max="10"
                      value={formData.home_bedrooms}
                      onChange={(e) => updateForm('home_bedrooms', parseInt(e.target.value) || 0)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Bathrooms</label>
                    <input 
                      type="number" min="0" max="10"
                      value={formData.home_bathrooms}
                      onChange={(e) => updateForm('home_bathrooms', parseInt(e.target.value) || 0)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm mb-2">Pets?</label>
                    <button 
                      onClick={() => updateForm('has_pets', !formData.has_pets)}
                      className={`w-full h-[58px] rounded-xl border font-bold transition-colors ${formData.has_pets ? 'bg-blue-500/20 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-white/50'}`}
                    >
                      {formData.has_pets ? 'Yes' : 'No'}
                    </button>
                  </div>
                </div>
              )}

              {/* Schedule */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/70 text-sm mb-2">Preferred Date</label>
                  <input 
                    type="date" 
                    value={formData.scheduled_date}
                    onChange={(e) => updateForm('scheduled_date', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500 transition-colors [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-white/70 text-sm mb-2">Preferred Window</label>
                  <select 
                    value={formData.scheduled_window}
                    onChange={(e) => updateForm('scheduled_window', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                  >
                    <option value="" disabled className="text-black">Select window...</option>
                    {windows.map(w => (
                      <option key={w.id} value={w.id} className="text-black">{w.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-white/70 text-sm mb-2">Describe what needs to be done</label>
                <textarea 
                  rows={3}
                  value={formData.description}
                  onChange={(e) => updateForm('description', e.target.value)}
                  placeholder="e.g. Deep clean of a 3-bedroom house before move-in."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                />
              </div>
            </div>

            <div className="mt-10 flex justify-between items-center">
              <button onClick={() => setStep(1)} className="text-white/60 hover:text-white transition-colors">
                Back
              </button>
              <button 
                disabled={!formData.address || !formData.scheduled_date || !formData.scheduled_window || isGeneratingQuote}
                onClick={handleGenerateQuote}
                className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold tracking-widest uppercase hover:bg-blue-500 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isGeneratingQuote ? 'Calculating...' : 'Get Instant Quote'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && quoteData && (
          <div className="animate-[fadeIn_0.5s_ease-out]">
            <h2 className="text-xl text-white font-medium mb-6">3. Your Instant Quote</h2>
            
            <div className="bg-gradient-to-br from-blue-900/40 to-blue-600/20 border border-blue-500/30 rounded-2xl p-8 mb-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-20 pointer-events-none">
                <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              </div>
              <p className="text-blue-200 text-sm font-bold tracking-widest uppercase mb-2">Estimated Total</p>
              <p className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-6">
                ${quoteData.base_quote.final_price.toFixed(2)}
              </p>

              <div className="space-y-3 pt-6 border-t border-blue-500/20">
                {quoteData.base_quote.line_items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-blue-100">{item.label}</span>
                    <span className="text-white font-medium">${item.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 flex justify-between items-center">
              <button onClick={() => setStep(2)} className="text-white/60 hover:text-white transition-colors">
                Back
              </button>
              <button 
                onClick={() => setStep(4)}
                className="bg-white text-[#010A14] px-8 py-3 rounded-full font-bold tracking-widest uppercase hover:scale-105 transition-transform"
              >
                Accept Quote
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-[fadeIn_0.5s_ease-out]">
            <h2 className="text-xl text-white font-medium mb-6">4. Contact Information</h2>
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
                You will not be charged yet. Submitting this request places your job into our dispatch network for final confirmation.
              </p>
            </div>

            <div className="flex justify-between items-center">
              <button 
                onClick={() => setStep(3)}
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
                {isSubmitting ? 'Submitting...' : 'Complete Request'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
