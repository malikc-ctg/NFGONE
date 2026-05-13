'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Zone } from '@/types';

const SERVICE_TYPES = [
  { value: 'standard_clean', label: 'Standard Clean' },
  { value: 'deep_clean', label: 'Deep Clean' },
  { value: 'move_out_clean', label: 'Move-Out Clean' },
  { value: 'move_in_clean', label: 'Move-In Clean' },
];

const WINDOWS = [
  { value: 'morning', label: 'Morning (8am–12pm)' },
  { value: 'afternoon', label: 'Afternoon (12pm–4pm)' },
  { value: 'evening', label: 'Evening (4pm–8pm)' },
];

export default function PartnerBookPage() {
  const router = useRouter();
  const [zones, setZones] = useState<Zone[]>([]);
  const [quote, setQuote] = useState<{ final_price: number; surge_reason: string | null } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    address_line1: '', city: '', postal_code: '',
    service_type: 'standard_clean', scheduled_date: '',
    scheduled_window: 'morning', zone_id: '',
    home_bedrooms: '2', home_bathrooms: '1',
    has_pets: false, add_ons: [] as string[],
    access_instructions: '', partner_reference: '',
  });

  useEffect(() => {
    fetch('/api/zones').then(r => r.json()).then(d => setZones(Array.isArray(d) ? d : []));
  }, []);

  async function fetchQuote() {
    if (!form.zone_id || !form.scheduled_date) return;
    const res = await fetch('/api/pricing/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        zone_id: form.zone_id,
        service_type: form.service_type,
        scheduled_date: form.scheduled_date,
        scheduled_window: form.scheduled_window,
        home_bedrooms: parseInt(form.home_bedrooms),
        home_bathrooms: parseInt(form.home_bathrooms),
        has_pets: form.has_pets,
        add_ons: form.add_ons,
      }),
    });
    if (res.ok) setQuote(await res.json());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!quote) return;
    setSubmitting(true);
    // TODO: get partner_id from session
    const res = await fetch('/api/partners/PARTNER_ID/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, quoted_price: quote.final_price }),
    });
    if (res.ok) {
      const job = await res.json();
      router.push(`/partner/jobs?booked=${job.id}`);
    }
    setSubmitting(false);
  }

  const update = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Book a Job</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Location</h2>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Address *</label>
            <input required className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" value={form.address_line1} onChange={e => update('address_line1', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">City *</label>
              <input required className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" value={form.city} onChange={e => update('city', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Postal Code *</label>
              <input required className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" value={form.postal_code} onChange={e => update('postal_code', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Service</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Service Type</label>
              <select className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" value={form.service_type} onChange={e => update('service_type', e.target.value)}>
                {SERVICE_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Zone</label>
              <select required className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" value={form.zone_id} onChange={e => update('zone_id', e.target.value)}>
                <option value="">Select zone…</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Date *</label>
              <input required type="date" className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" value={form.scheduled_date} onChange={e => update('scheduled_date', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Window</label>
              <select className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" value={form.scheduled_window} onChange={e => update('scheduled_window', e.target.value)}>
                {WINDOWS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Bedrooms</label>
              <input type="number" min="1" max="8" className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" value={form.home_bedrooms} onChange={e => update('home_bedrooms', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Bathrooms</label>
              <input type="number" min="1" max="6" className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" value={form.home_bathrooms} onChange={e => update('home_bathrooms', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Pets</label>
              <select className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" value={form.has_pets ? 'yes' : 'no'} onChange={e => update('has_pets', e.target.value === 'yes')}>
                <option value="no">No pets</option>
                <option value="yes">Has pets</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Details</h2>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Access Instructions</label>
            <textarea rows={2} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none" value={form.access_instructions} onChange={e => update('access_instructions', e.target.value)} placeholder="Lockbox code, key location, gate code…" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Your Reference # (optional)</label>
            <input className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" value={form.partner_reference} onChange={e => update('partner_reference', e.target.value)} placeholder="MLS-1234 or client name" />
          </div>
        </div>

        <button
          type="button"
          onClick={fetchQuote}
          className="w-full py-2.5 border border-primary text-primary rounded-lg text-sm font-medium hover:bg-primary/5 transition-colors"
        >
          Get Price Quote
        </button>

        {quote && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            {quote.surge_reason && (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-100 px-3 py-2 rounded-lg mb-3">
                <span>⚡</span>
                <span>{quote.surge_reason} — pricing reflects current demand</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-blue-900">Quoted Price</p>
              <p className="text-2xl font-bold text-blue-900">${quote.final_price.toFixed(2)}</p>
            </div>
            <p className="text-xs text-blue-600 mt-0.5">No deposit required — invoiced monthly</p>
          </div>
        )}

        {quote && (
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Booking…' : 'Confirm Booking'}
          </button>
        )}
      </form>
    </div>
  );
}
