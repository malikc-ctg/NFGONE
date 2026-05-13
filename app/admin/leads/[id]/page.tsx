'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { SERVICE_TYPE_LABELS, TIME_WINDOW_LABELS } from '@/types';
import type { Lead } from '@/types';
import Link from 'next/link';

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [convertOpen, setConvertOpen] = useState(false);
  const [zones, setZones] = useState<any[]>([]);
  const [convertForm, setConvertForm] = useState({
    zone_id: '', scheduled_date: '', scheduled_window: '',
    address_line1: '', postal_code: '', quoted_price: '',
  });

  useEffect(() => {
    async function fetchLead() {
      const res = await fetch(`/api/leads/${params.id}`);
      const data = await res.json();
      setLead(data);
      setConvertForm(f => ({
        ...f,
        scheduled_date: data.preferred_date ?? '',
        scheduled_window: data.preferred_window ?? '',
        quoted_price: data.quoted_price?.toString() ?? '',
      }));
      setLoading(false);
    }
    async function fetchZones() {
      const res = await fetch('/api/zones');
      const data = await res.json();
      setZones(Array.isArray(data) ? data : []);
    }
    fetchLead();
    fetchZones();
  }, [params.id]);

  async function handleConvert() {
    try {
      const res = await fetch(`/api/leads/${params.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...convertForm,
          quoted_price: parseFloat(convertForm.quoted_price),
          deposit_amount: parseFloat(convertForm.quoted_price) * 0.3,
        }),
      });
      if (!res.ok) throw new Error('Failed to convert');
      const job = await res.json();
      toast.success('Lead converted to job');
      router.push(`/admin/jobs/${job.id}`);
    } catch {
      toast.error('Conversion failed');
    }
  }

  async function updateStatus(status: string) {
    await fetch(`/api/leads/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setLead(l => l ? { ...l, status: status as any } : l);
    toast.success(`Status updated to ${status}`);
  }

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!lead) return <p className="text-red-500">Lead not found</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/leads"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link>
        <h1 className="text-2xl font-bold">Lead: {lead.customer_name ?? 'Unknown'}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Contact Info</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span>{lead.customer_name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{lead.customer_phone}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{lead.customer_email}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">City</span><span>{lead.city}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Source</span><span className="capitalize">{lead.source}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Job Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between"><span className="text-muted-foreground">Service</span><span>{lead.service_type ? SERVICE_TYPE_LABELS[lead.service_type] : '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{lead.preferred_date ? format(new Date(lead.preferred_date), 'MMM d, yyyy') : '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Window</span><span>{lead.preferred_window ? TIME_WINDOW_LABELS[lead.preferred_window] : '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Bedrooms</span><span>{lead.home_bedrooms ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Bathrooms</span><span>{lead.home_bathrooms ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Condition</span><span className="capitalize">{lead.condition ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Pets</span><span>{lead.has_pets ? 'Yes' : 'No'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Quoted Price</span><span className="font-bold">{lead.quoted_price ? `$${lead.quoted_price}` : '—'}</span></div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Select onValueChange={updateStatus}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Update status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="quoted">Quoted</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>

        {lead.status !== 'converted' && (
          <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
            <DialogTrigger asChild>
              <Button><ArrowRight className="h-4 w-4 mr-2" />Convert to Job</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Convert Lead to Job</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Zone</Label>
                  <Select value={convertForm.zone_id} onValueChange={(v) => setConvertForm({ ...convertForm, zone_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select zone" /></SelectTrigger>
                    <SelectContent>{zones.map(z => <SelectItem key={z.id} value={z.id}>{z.name} ({z.city})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Scheduled Date</Label><Input type="date" value={convertForm.scheduled_date} onChange={e => setConvertForm({ ...convertForm, scheduled_date: e.target.value })} /></div>
                <div><Label>Window</Label>
                  <Select value={convertForm.scheduled_window} onValueChange={v => setConvertForm({ ...convertForm, scheduled_window: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Morning</SelectItem>
                      <SelectItem value="afternoon">Afternoon</SelectItem>
                      <SelectItem value="evening">Evening</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Address</Label><Input value={convertForm.address_line1} onChange={e => setConvertForm({ ...convertForm, address_line1: e.target.value })} /></div>
                <div><Label>Postal Code</Label><Input value={convertForm.postal_code} onChange={e => setConvertForm({ ...convertForm, postal_code: e.target.value })} /></div>
                <div><Label>Quoted Price</Label><Input type="number" value={convertForm.quoted_price} onChange={e => setConvertForm({ ...convertForm, quoted_price: e.target.value })} /></div>
                <Button onClick={handleConvert} className="w-full">Convert & Create Job</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
