'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getLiveQuote } from '@/app/customer-site/quote/actions';
import { submitInternalQuoteRequest } from './actions';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';

export default function InternalQuotePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quoteData, setQuoteData] = useState<any>(null);

  const [formData, setFormData] = useState({
    category: '',
    description: '',
    home_bedrooms: 2,
    home_bathrooms: 1,
    has_pets: false,
    scheduled_date: '',
    scheduled_window: '',
  });

  const updateForm = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const categories = [
    'Standard Clean', 'Deep Clean', 'Move In/Out Clean', 
    'Recurring Standard', 'Recurring Deep'
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
      let service_type = 'standard_clean';
      if (formData.category === 'Deep Clean') service_type = 'deep_clean';
      else if (formData.category === 'Move In/Out Clean') service_type = 'move_in_clean'; // Or move_out_clean based on description, using move_in_clean as proxy for both
      else if (formData.category === 'Recurring Standard') service_type = 'recurring_standard';
      else if (formData.category === 'Recurring Deep') service_type = 'recurring_deep';

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
        setError(res.error || 'Failed to generate quote. Please ensure we service this category.');
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
      const res = await submitInternalQuoteRequest({
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
      <div className="min-h-[calc(100vh-64px)] bg-slate-50 flex flex-col justify-center items-center py-20 px-6">
        <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
          <div className="h-20 w-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Request Submitted</h1>
          <p className="text-slate-500 text-lg mb-8">
            Your quote request has been sent to our dispatch team for verification. We will review it shortly.
          </p>
          <button 
            onClick={() => router.push('/customer-site/portal')}
            className="inline-block bg-[#001a36] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#022850] transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 py-12 px-6">
      <div className="container max-w-3xl mx-auto">
        <Link href="/customer-site/portal" className="text-slate-500 hover:text-slate-900 text-sm font-medium flex items-center gap-2 mb-8 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        
        <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-12 shadow-sm">
          <div className="flex justify-between items-end mb-10 border-b border-slate-100 pb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Request a Quote</h1>
              <p className="text-slate-500 text-lg">Instant pricing & seamless booking.</p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-sm font-bold tracking-widest uppercase">
              <span className={step >= 1 ? 'text-blue-600' : 'text-slate-300'}>1</span>
              <span className="text-slate-300">-</span>
              <span className={step >= 2 ? 'text-blue-600' : 'text-slate-300'}>2</span>
              <span className="text-slate-300">-</span>
              <span className={step >= 3 ? 'text-blue-600' : 'text-slate-300'}>3</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl mb-8 text-sm">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl text-slate-900 font-semibold mb-6">1. Select a Service</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => updateForm('category', cat)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      formData.category === cat 
                        ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-sm font-medium' 
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
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
                  className="bg-[#001a36] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#022850] transition-colors disabled:opacity-50 disabled:hover:bg-[#001a36]"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl text-slate-900 font-semibold mb-6">2. Job Details</h2>
              
              <div className="space-y-8">
                {/* Specs */}
                <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-slate-700 text-sm font-medium mb-2">Bedrooms</label>
                      <input 
                        type="number" min="0" max="10"
                        value={formData.home_bedrooms}
                        onChange={(e) => updateForm('home_bedrooms', parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 text-sm font-medium mb-2">Bathrooms</label>
                      <input 
                        type="number" min="0" max="10"
                        value={formData.home_bathrooms}
                        onChange={(e) => updateForm('home_bathrooms', parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 text-sm font-medium mb-2">Pets?</label>
                      <button 
                        onClick={() => updateForm('has_pets', !formData.has_pets)}
                        className={`w-full h-[58px] rounded-xl border font-bold transition-colors ${formData.has_pets ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                      >
                        {formData.has_pets ? 'Yes' : 'No'}
                      </button>
                    </div>
                  </div>

                {/* Schedule */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 text-sm font-medium mb-2">Preferred Date</label>
                    <input 
                      type="date" 
                      value={formData.scheduled_date}
                      onChange={(e) => updateForm('scheduled_date', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 text-sm font-medium mb-2">Preferred Window</label>
                    <select 
                      value={formData.scheduled_window}
                      onChange={(e) => updateForm('scheduled_window', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                    >
                      <option value="" disabled>Select window...</option>
                      {windows.map(w => (
                        <option key={w.id} value={w.id}>{w.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-slate-700 text-sm font-medium mb-2">Describe what needs to be done</label>
                  <textarea 
                    rows={3}
                    value={formData.description}
                    onChange={(e) => updateForm('description', e.target.value)}
                    placeholder="e.g. Deep clean of a 3-bedroom house before move-in."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  />
                </div>
              </div>

              <div className="mt-10 flex justify-between items-center">
                <button onClick={() => setStep(1)} className="text-slate-500 hover:text-slate-900 font-medium transition-colors">
                  Back
                </button>
                <button 
                  disabled={!formData.scheduled_date || !formData.scheduled_window || isGeneratingQuote}
                  onClick={handleGenerateQuote}
                  className="bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isGeneratingQuote ? 'Calculating...' : 'Get Instant Quote'}
                </button>
              </div>
            </div>
          )}

          {step === 3 && quoteData && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl text-slate-900 font-semibold mb-6">3. Your Instant Quote</h2>
              
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 mb-8">
                <p className="text-slate-500 text-sm font-bold tracking-widest uppercase mb-2">Estimated Total</p>
                <p className="text-5xl md:text-6xl font-black text-slate-900 tracking-tighter mb-6">
                  ${quoteData.base_quote.final_price.toFixed(2)}
                </p>

                <div className="space-y-3 pt-6 border-t border-slate-200">
                  {quoteData.base_quote.line_items.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-slate-600">{item.label}</span>
                      <span className="text-slate-900 font-medium">${item.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-8 flex gap-4 items-start">
                <div className="h-2 w-2 rounded-full bg-blue-600 mt-2 shrink-0 animate-pulse" />
                <p className="text-sm text-blue-800">
                  You will not be charged yet. Submitting this request sends it to our dispatch network for final verification.
                </p>
              </div>

              <div className="mt-10 flex justify-between items-center">
                <button 
                  onClick={() => setStep(2)}
                  disabled={isSubmitting}
                  className="text-slate-500 hover:text-slate-900 font-medium transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-[#001a36] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#022850] transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
