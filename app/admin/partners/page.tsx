'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Building2, ExternalLink } from 'lucide-react';
import type { Partner, Zone } from '@/types';
import { format } from 'date-fns';

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    email: '', full_name: '', company_name: '',
    partner_type: 'realtor', zone_id: '', notes: '',
  });

  useEffect(() => {
    Promise.all([
      fetch('/api/partners').then(r => r.json()),
      fetch('/api/zones').then(r => r.json()),
    ]).then(([p, z]) => { setPartners(Array.isArray(p) ? p : []); setZones(Array.isArray(z) ? z : []); setLoading(false); });
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/partners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const newPartner = await res.json();
      setPartners((prev) => [newPartner, ...prev]);
      setCreating(false);
      setForm({ email: '', full_name: '', company_name: '', partner_type: 'realtor', zone_id: '', notes: '' });
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Partners</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Realtors and property managers — invite-only</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Partner
        </button>
      </div>

      {creating && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold mb-4 text-sm">New Partner Invite</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Email *</label>
              <input required type="email" className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Contact Name *</label>
              <input required className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Company Name *</label>
              <input required className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Partner Type</label>
              <select className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" value={form.partner_type} onChange={e => setForm(f => ({ ...f, partner_type: e.target.value }))}>
                <option value="realtor">Realtor</option>
                <option value="property_manager">Property Manager</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Zone</label>
              <select className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" value={form.zone_id} onChange={e => setForm(f => ({ ...f, zone_id: e.target.value }))}>
                <option value="">— No zone assigned —</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Notes</label>
              <input className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setCreating(false)} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">Send Invite</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Loading partners…</div>
        ) : partners.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No partners yet. Create your first partner above.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground">Company</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Zone</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Credit Balance</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Billing</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-6 py-3.5">
                    <div className="font-medium text-foreground">{p.company_name}</div>
                    <div className="text-xs text-muted-foreground">{(p.profile as { email?: string } | undefined)?.email}</div>
                  </td>
                  <td className="px-4 py-3.5 capitalize text-muted-foreground">{p.partner_type.replace('_', ' ')}</td>
                  <td className="px-4 py-3.5 text-muted-foreground">{(p.zone as Zone | undefined)?.name ?? '—'}</td>
                  <td className="px-4 py-3.5 font-medium">${p.credit_balance.toFixed(2)}</td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.invoice_billing ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                      {p.invoice_billing ? 'Monthly Invoice' : 'Per-Job Deposit'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground text-xs">{format(new Date(p.created_at), 'MMM d, yyyy')}</td>
                  <td className="px-4 py-3.5">
                    <Link href={`/admin/partners/${p.id}`} className="text-primary hover:underline flex items-center gap-1 text-xs">
                      View <ExternalLink className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
