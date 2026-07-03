'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DatePicker } from '@/components/ui/date-picker';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import { DEFAULT_PRICING, SERVICE_TYPE_LABELS } from '@/types';
import type { ServiceType } from '@/types';
import { Home, Building2, Warehouse } from 'lucide-react';
import { calculateQuote } from '@/lib/pricing/calculator';
import type { PackageType, Frequency, PropertyType } from '@/lib/pricing/constants';

const SERVICES = [
  { value: 'standard_clean', label: 'Standard Clean', desc: 'Full home regular cleaning', icon: '🏠' },
  { value: 'deep_clean', label: 'Deep Clean', desc: 'Thorough top-to-bottom scrub', icon: '✨' },
  { value: 'move_out_clean', label: 'Move-Out Clean', desc: 'Ready the home for handover', icon: '📦' },
  { value: 'move_in_clean', label: 'Move-In Clean', desc: 'Fresh start in your new home', icon: '🔑' },
];

const ADD_ONS = [
  { value: 'inside_fridge', label: 'Inside Fridge', price: 25 },
  { value: 'inside_oven', label: 'Inside Oven', price: 25 },
  { value: 'inside_cabinets', label: 'Inside Cabinets', price: 25 },
  { value: 'baseboards', label: 'Baseboards', price: 25 },
  { value: 'interior_windows', label: 'Interior Windows', price: 25 },
];

const WINDOWS = [
  { value: 'morning', label: 'Morning', sub: '8am – 12pm' },
  { value: 'afternoon', label: 'Afternoon', sub: '12pm – 4pm' },
  { value: 'evening', label: 'Evening', sub: '4pm – 8pm' },
];

const STEPS = ['Service', 'Home', 'Schedule', 'Contact', 'Confirm'];

function calcEstimate(
  service: string,
  beds: number,
  baths: number,
  pets: boolean,
  addOns: string[],
  propertyType: 'condo' | 'basement' | 'house'
): number {
  let selectedPackage: PackageType = 'standard';
  if (service === 'deep_clean') selectedPackage = 'deep_clean';
  else if (service === 'move_out_clean' || service === 'move_in_clean') selectedPackage = 'move_in_out';

  // Fallback sqft estimation logic from bed/bath
  let sqft = 1000;
  if (propertyType === 'condo') {
    if (beds <= 1) sqft = 600;
    else if (beds === 2) sqft = 1000;
    else sqft = 1250;
  } else if (propertyType === 'basement') {
    if (beds <= 1) sqft = 600;
    else sqft = 800;
  } else if (propertyType === 'house') {
    if (beds <= 2) sqft = 500;
    else if (beds === 3) sqft = 1250;
    else sqft = 2250;
  }

  // Include heavy pet hair add-on if pets is true
  const selectedAddOnIds = [...addOns];
  if (pets && !selectedAddOnIds.includes('heavy_pet_hair')) {
    selectedAddOnIds.push('heavy_pet_hair');
  }

  const quoteResult = calculateQuote({
    propertyType,
    sqft,
    selectedPackage,
    frequency: 'one_time',
    fullBathrooms: baths,
    halfBathrooms: 0,
    selectedAddOnIds,
    customAddOnPrices: {},
    addOnQuantities: {},
    vacancyConfirmed: selectedPackage === 'move_in_out' ? true : undefined,
  });

  if (quoteResult.requiresCustomQuote) {
    return 0; // custom quote required
  }

  const finalPrice = typeof quoteResult.total === 'number'
    ? quoteResult.total
    : (quoteResult.total[0] + quoteResult.total[1]) / 2;

  return Math.round(finalPrice);
}

export default function BookingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState<string | null>(null);

  const [form, setForm] = useState({
    service_type: 'standard_clean',
    home_bedrooms: 2,
    home_bathrooms: 1,
    home_size_sqft: '',
    has_pets: false,
    add_ons: [] as string[],
    scheduled_date: '',
    scheduled_window: 'morning',
    full_name: '',
    email: '',
    phone: '',
    address_line1: '',
    city: '',
    postal_code: '',
    access_instructions: '',
    property_type: 'house',
  });

  const estimate = calcEstimate(form.service_type, form.home_bedrooms, form.home_bathrooms, form.has_pets, form.add_ons, form.property_type as any);

  const update = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const toggleAddOn = (val: string) => {
    setForm(f => ({
      ...f,
      add_ons: f.add_ons.includes(val) ? f.add_ons.filter(a => a !== val) : [...f.add_ons, val],
    }));
  };

  // Minimum booking date — tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          quoted_price: estimate,
          source: 'website',
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Booking failed');
      }
      const data = await res.json();
      setBooked(data.lead_id ?? data.id ?? 'success');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const canProceed = [
    !!form.service_type,
    form.home_bedrooms >= 1 && form.home_bathrooms >= 1,
    !!form.scheduled_date && !!form.scheduled_window,
    !!form.full_name && !!form.email && !!form.phone && !!form.address_line1 && !!form.city && !!form.postal_code,
    true,
  ];

  if (booked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">You&apos;re Booked! 🎉</h1>
            <p className="text-gray-600 mt-3 leading-relaxed">
              We&apos;ve received your request for a <strong>{SERVICE_TYPE_LABELS[form.service_type as ServiceType]}</strong> on <strong>{form.scheduled_date}</strong>.
              Our team will confirm your cleaner within 2 hours via email.
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 text-left space-y-2">
            <p className="text-sm font-semibold text-blue-900">What happens next?</p>
            <ul className="text-sm text-blue-700 space-y-1.5">
              <li>✅ A confirmation email is on its way to {form.email}</li>
              <li>📋 We&apos;ll match you with a verified, insured cleaner</li>
              <li>📱 You&apos;ll get a notification when your cleaner is on the way</li>
            </ul>
          </div>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Nav */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7C3 5.9 3.9 5 5 5h14c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V7z" />
              </svg>
            </div>
            <span className="font-bold text-gray-900">Sea of Blue</span>
          </div>
          <div className="text-sm text-gray-500 font-medium">Step {step + 1} of {STEPS.length}</div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-400 font-medium">
            {STEPS.map((s, i) => (
              <span key={s} className={i <= step ? 'text-blue-600 font-semibold' : ''}>{s}</span>
            ))}
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Live Estimate Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 flex items-center justify-between text-white">
          <div>
            <p className="text-blue-100 text-xs font-medium">Your Estimate</p>
            <p className="text-3xl font-black">${estimate}</p>
          </div>
          <div className="text-right text-sm text-blue-100">
            <p>{SERVICE_TYPE_LABELS[form.service_type as ServiceType]}</p>
            <p>{form.home_bedrooms}bd / {form.home_bathrooms}ba</p>
          </div>
        </div>

        {/* ── Step 0: Service ── */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">What type of clean?</h2>
            <div className="grid grid-cols-1 gap-3">
              {SERVICES.map(s => (
                <button
                  key={s.value}
                  onClick={() => update('service_type', s.value)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
                    form.service_type === s.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-100 bg-white hover:border-blue-200 hover:bg-blue-50/30'
                  }`}
                >
                  <span className="text-3xl">{s.icon}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{s.label}</p>
                    <p className="text-sm text-gray-500">{s.desc}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-blue-600">${DEFAULT_PRICING[s.value as ServiceType]}</p>
                    <p className="text-xs text-gray-400">starting from</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Add-ons */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Add-Ons <span className="text-gray-400 font-normal text-sm">(+$25 each)</span></h3>
              <div className="grid grid-cols-2 gap-2">
                {ADD_ONS.map(a => (
                  <button
                    key={a.value}
                    onClick={() => toggleAddOn(a.value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      form.add_ons.includes(a.value)
                        ? 'border-blue-400 bg-blue-50 text-blue-700'
                        : 'border-gray-100 bg-white text-gray-700 hover:border-blue-200'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${
                      form.add_ons.includes(a.value) ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300'
                    }`}>
                      {form.add_ons.includes(a.value) ? '✓' : ''}
                    </span>
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 1: Home Details ── */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-2xl font-bold text-gray-900">Tell us about your home</h2>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Property Type</label>
                <div className="flex gap-2">
                  {[
                    { id: 'house', label: 'House', icon: Home },
                    { id: 'condo', label: 'Condo/Apt', icon: Building2 },
                    { id: 'basement', label: 'Basement', icon: Warehouse },
                  ].map((pt) => {
                    const Icon = pt.icon;
                    const isSelected = (form as any).property_type === pt.id;
                    return (
                      <button
                        key={pt.id}
                        type="button"
                        onClick={() => update('property_type', pt.id)}
                        className={`flex-1 py-3 px-2 rounded-xl border flex flex-col items-center gap-1.5 text-xs font-semibold transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-100 bg-gray-50 hover:border-blue-200'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        {pt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Bedrooms</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, '6+'].map(n => (
                    <button
                      key={n}
                      onClick={() => update('home_bedrooms', typeof n === 'number' ? n : 6)}
                      className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-all ${
                        form.home_bedrooms === (typeof n === 'number' ? n : 6)
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-100 bg-gray-50 hover:border-blue-200'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Bathrooms</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, '5+'].map(n => (
                    <button
                      key={n}
                      onClick={() => update('home_bathrooms', typeof n === 'number' ? n : 5)}
                      className={`flex-1 py-3 rounded-xl border text-sm font-semibold transition-all ${
                        form.home_bathrooms === (typeof n === 'number' ? n : 5)
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-100 bg-gray-50 hover:border-blue-200'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => update('has_pets', !form.has_pets)}
                  className={`w-12 h-6 rounded-full transition-colors ${form.has_pets ? 'bg-blue-500' : 'bg-gray-200'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${form.has_pets ? 'translate-x-6' : ''}`} />
                </button>
                <span className="text-sm font-medium text-gray-700">Pets in home <span className="text-gray-400">(+$15)</span></span>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Schedule ── */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-2xl font-bold text-gray-900">When works for you?</h2>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Preferred Date *</label>
                <DatePicker
                  minDate={minDate}
                  value={form.scheduled_date}
                  onChange={(val) => setForm(prev => ({ ...prev, scheduled_date: val }))}
                  className="w-full bg-white text-gray-900 border-gray-200"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Time Window *</label>
                <div className="grid grid-cols-3 gap-3">
                  {WINDOWS.map(w => (
                    <button
                      key={w.value}
                      onClick={() => update('scheduled_window', w.value)}
                      className={`py-4 px-3 rounded-xl border text-center transition-all ${
                        form.scheduled_window === w.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-100 bg-gray-50 hover:border-blue-200'
                      }`}
                    >
                      <p className="font-semibold text-sm">{w.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{w.sub}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Contact ── */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-2xl font-bold text-gray-900">Your details</h2>
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name *</label>
                  <input
                    value={form.full_name} onChange={e => update('full_name', e.target.value)}
                    placeholder="Jane Smith"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email *</label>
                    <input
                      type="email" value={form.email} onChange={e => update('email', e.target.value)}
                      placeholder="jane@email.com"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone *</label>
                    <input
                      type="tel" value={form.phone} onChange={e => update('phone', e.target.value)}
                      placeholder="(555) 000-0000"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Address *</label>
                  <AddressAutocomplete
                    value={form.address_line1} 
                    onChange={e => update('address_line1', e.target.value)}
                    onAddressSelect={(addr) => {
                      update('address_line1', addr.address_line1);
                      if (addr.city) update('city', addr.city);
                      if (addr.postal_code) update('postal_code', addr.postal_code);
                    }}
                    placeholder="123 Main Street"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">City *</label>
                    <input
                      value={form.city} onChange={e => update('city', e.target.value)}
                      placeholder="Toronto"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Postal Code *</label>
                    <input
                      value={form.postal_code} onChange={e => update('postal_code', e.target.value)}
                      placeholder="M5V 1A1"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Access Instructions <span className="text-gray-400 font-normal">(optional)</span></label>
                  <textarea
                    value={form.access_instructions} onChange={e => update('access_instructions', e.target.value)}
                    placeholder="Lockbox code, building entrance, parking instructions..."
                    rows={2}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 4: Confirm ── */}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-2xl font-bold text-gray-900">Confirm your booking</h2>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 bg-blue-600 text-white">
                <p className="text-lg font-bold">{SERVICE_TYPE_LABELS[form.service_type as ServiceType]}</p>
                <p className="text-blue-100 text-sm">{form.scheduled_date} · {WINDOWS.find(w => w.value === form.scheduled_window)?.label}</p>
              </div>
              <div className="divide-y divide-gray-50">
                <div className="px-5 py-3 flex justify-between text-sm">
                  <span className="text-gray-500">Customer</span>
                  <span className="font-medium">{form.full_name}</span>
                </div>
                <div className="px-5 py-3 flex justify-between text-sm">
                  <span className="text-gray-500">Address</span>
                  <span className="font-medium text-right">{form.address_line1}, {form.city}</span>
                </div>
                <div className="px-5 py-3 flex justify-between text-sm">
                  <span className="text-gray-500">Home</span>
                  <span className="font-medium">{form.home_bedrooms}bd / {form.home_bathrooms}ba{form.has_pets ? ' · Pets' : ''}</span>
                </div>
                {form.add_ons.length > 0 && (
                  <div className="px-5 py-3 flex justify-between text-sm">
                    <span className="text-gray-500">Add-Ons</span>
                    <span className="font-medium text-right">{form.add_ons.map(a => a.replace(/_/g, ' ')).join(', ')}</span>
                  </div>
                )}
                <div className="px-5 py-4 flex justify-between items-center bg-green-50">
                  <span className="font-semibold text-green-800">Estimated Total</span>
                  <span className="text-2xl font-black text-green-700">${estimate}</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400 text-center">
              No payment now. Our team will confirm your booking and send a secure payment link.
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pb-8">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex-1 py-3.5 border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              ← Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed[step]}
              className="flex-1 py-3.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-3.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : '✓ Confirm Booking'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
