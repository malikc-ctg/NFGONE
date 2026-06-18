'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { Customer } from '@/types';
import Link from 'next/link';

export default function CustomerDetailPage() {
  const params = useParams();
  const [customer, setCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    async function fetchCustomer() {
      const res = await fetch('/api/customers');
      const data = await res.json();
      const found = (Array.isArray(data) ? data : []).find((c: any) => c.id === params.id);
      setCustomer(found ?? null);
    }
    fetchCustomer();
  }, [params.id]);

  if (!customer) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/wegettinmoneynga/customers"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link>
        <h1 className="text-2xl font-bold">{customer.full_name}</h1>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Contact Info</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{customer.email}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{customer.phone}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Address</span><span>{customer.address_line1 ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">City</span><span>{customer.city ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Postal Code</span><span>{customer.postal_code ?? '—'}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Customer Profile & Preferences</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
              <h3 className="font-semibold text-slate-800 text-xs uppercase tracking-wider mb-2">Home Details</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Bedrooms</span><span className="font-medium">{(() => { try { return JSON.parse(customer.notes || '{}').bedrooms || 'Not set'; } catch { return 'Not set'; } })()}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Bathrooms</span><span className="font-medium">{(() => { try { return JSON.parse(customer.notes || '{}').bathrooms || 'Not set'; } catch { return 'Not set'; } })()}</span></div>
                <div className="flex justify-between col-span-2"><span className="text-muted-foreground">Pets</span><span className="font-medium">{(() => { try { const p = JSON.parse(customer.notes || '{}'); return p.has_pets ? p.pets_description || 'Yes' : 'No'; } catch { return 'No'; } })()}</span></div>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <span className="text-muted-foreground block mb-1">Entry Instructions</span>
                <span className="text-xs bg-white p-2 rounded block border border-slate-200">{(() => { try { return JSON.parse(customer.notes || '{}').entry_instructions || 'None provided'; } catch { return 'None provided'; } })()}</span>
              </div>
            </div>

            <div className="space-y-3 text-sm bg-blue-50 p-3 rounded-lg border border-blue-100">
              <h3 className="font-semibold text-blue-800 text-xs uppercase tracking-wider mb-2">Referral Program</h3>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Personal Code</span>
                <span className="font-mono bg-white px-2 py-1 rounded border border-blue-200 text-blue-700 font-bold">SOB-{customer.id.substring(0, 6).toUpperCase()}</span>
              </div>
            </div>
            
            <div className="pt-2">
              <h3 className="font-semibold text-slate-800 text-xs uppercase tracking-wider mb-2">Internal Admin Notes</h3>
              <p className="text-xs text-muted-foreground">{(() => { try { return JSON.parse(customer.notes || '{}').admin_notes || 'No admin notes'; } catch { return customer.notes || 'No admin notes'; } })()}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
