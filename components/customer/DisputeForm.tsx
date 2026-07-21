'use client';

import { useState } from 'react';
import { Upload, X, AlertTriangle } from 'lucide-react';

interface DisputeFormProps {
  jobId: string;
  customerId: string;
  employeeId: string | null;
  onSubmitted?: () => void;
}

const CATEGORIES = [
  { value: 'missed_items', label: 'Items were missed or not cleaned properly' },
  { value: 'damage', label: 'Something was damaged during the clean' },
  { value: 'no_show', label: 'Cleaner did not show up' },
  { value: 'billing', label: 'Billing or pricing issue' },
  { value: 'other', label: 'Other issue' },
];

export default function DisputeForm({ jobId, customerId, employeeId, onSubmitted }: DisputeFormProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category || !description.trim()) return;

    setSubmitting(true);
    setError('');

    // In production, upload photos to Supabase Storage first
    const evidenceUrls: string[] = [];
    // TODO: upload photos and get URLs

    const res = await fetch('/api/disputes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: jobId,
        customer_id: customerId,
        employee_id: employeeId,
        category, description,
        evidence_urls: evidenceUrls,
      }),
    });

    if (res.ok) {
      setSubmitted(true);
      onSubmitted?.();
    } else {
      const data = await res.json();
      setError(data.error ?? 'Failed to submit. Please try again.');
    }
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
        <p className="text-sm font-semibold text-green-800">Dispute submitted</p>
        <p className="text-xs text-green-600 mt-1">We will review your complaint and contact you within 24 hours.</p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-4 py-2.5 hover:bg-muted"
      >
        <AlertTriangle className="h-4 w-4" />
        Something went wrong?
      </button>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Report an Issue</h3>
        <button onClick={() => setOpen(false)} className="p-1 hover:bg-muted rounded-lg transition-colors">
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-muted-foreground mb-2">What went wrong?</label>
          <div className="space-y-2">
            {CATEGORIES.map((c) => (
              <label key={c.value} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                category === c.value ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
              }`}>
                <input
                  type="radio"
                  name="category"
                  value={c.value}
                  checked={category === c.value}
                  onChange={(e) => setCategory(e.target.value)}
                  className="accent-primary"
                />
                <span className="text-sm">{c.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">Describe the issue *</label>
          <textarea
            required
            rows={4}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none"
            placeholder="Please describe what happened in detail…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-2">Photos (optional, up to 6)</label>
          <div className="flex flex-wrap gap-2">
            {photos.map((f, i) => (
              <div key={i} className="relative w-16 h-16 rounded-lg bg-muted overflow-hidden">
                <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos(p => p.filter((_, j) => j !== i))}
                  className="absolute top-0.5 right-0.5 bg-black/50 rounded-full p-0.5"
                >
                  <X className="h-2.5 w-2.5 text-white" />
                </button>
              </div>
            ))}
            {photos.length < 6 && (
              <label className="w-16 h-16 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && photos.length < 6) setPhotos(p => [...p, file]);
                  }}
                />
              </label>
            )}
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={!category || !description.trim() || submitting}
          className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit Dispute'}
        </button>
      </form>
    </div>
  );
}
