'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { SERVICE_TYPE_LABELS, DEFAULT_PRICING } from '@/types';
import type { Lead, ServiceType, TimeWindow, AddOn } from '@/types';
import Link from 'next/link';
import { QuickQuoteCalculator } from '@/components/admin/leads/QuickQuoteCalculator';

const ADD_ON_OPTIONS: { value: AddOn; label: string }[] = [
  { value: 'inside_fridge', label: 'Inside Fridge' },
  { value: 'inside_oven', label: 'Inside Oven' },
  { value: 'inside_cabinets', label: 'Inside Cabinets' },
  { value: 'baseboards', label: 'Baseboards' },
  { value: 'interior_windows', label: 'Interior Windows' },
];

const LEAD_STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-amber-100 text-amber-700',
  quoted: 'bg-purple-100 text-purple-700',
  converted: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // New lead form
  const [form, setForm] = useState({
    customer_name: '', customer_phone: '', customer_email: '',
    city: '', service_type: '' as ServiceType | '',
    preferred_date: '', preferred_window: '' as TimeWindow | '',
    home_bedrooms: '', home_bathrooms: '', home_size_sqft: '',
    condition: '', has_pets: false, add_ons: [] as AddOn[],
    notes: '', quoted_price: '', source: 'lsa',
  });

  async function fetchLeads() {
    try {
      const url = statusFilter !== 'all' ? `/api/leads?status=${statusFilter}` : '/api/leads';
      const res = await fetch(url);
      const data = await res.json();
      setLeads(Array.isArray(data) ? data : []);
    } catch { // err removed
      console.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchLeads(); }, [statusFilter]);

  async function handleSubmit() {
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          home_bedrooms: form.home_bedrooms ? parseInt(form.home_bedrooms) : null,
          home_bathrooms: form.home_bathrooms ? parseInt(form.home_bathrooms) : null,
          home_size_sqft: form.home_size_sqft ? parseInt(form.home_size_sqft) : null,
          quoted_price: form.quoted_price ? parseFloat(form.quoted_price) : null,
          service_type: form.service_type || null,
          preferred_window: form.preferred_window || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to create lead');
      toast.success('Lead created');
      setDrawerOpen(false);
      setForm({
        customer_name: '', customer_phone: '', customer_email: '',
        city: '', service_type: '', preferred_date: '', preferred_window: '',
        home_bedrooms: '', home_bathrooms: '', home_size_sqft: '',
        condition: '', has_pets: false, add_ons: [], notes: '', quoted_price: '',
        source: 'lsa',
      });
      fetchLeads();
    } catch {
      toast.error('Failed to create lead');
    }
  }

  // Auto-calculate suggested price
  useEffect(() => {
    if (form.service_type && !form.quoted_price) {
      const base = DEFAULT_PRICING[form.service_type as ServiceType] ?? 0;
      if (base) setForm((f) => ({ ...f, quoted_price: base.toString() }));
    }
  }, [form.service_type]);

  const filtered = leads;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground">Manage incoming leads and quotes</p>
        </div>
        <div className="flex items-center gap-3">
          <QuickQuoteCalculator />
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New Lead</Button>
            </SheetTrigger>
          <SheetContent className="w-[480px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>New Lead</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-6">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Name</Label><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
                <div><Label>Phone</Label><Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} /></div>
              </div>
              <div><Label>Email</Label><Input type="email" value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
                <div>
                  <Label>Source</Label>
                  <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lsa">LSA</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="realtor">Realtor</SelectItem>
                      <SelectItem value="inbound_call">Inbound Call</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Service Type</Label>
                <Select value={form.service_type} onValueChange={(v) => setForm({ ...form, service_type: v as ServiceType })}>
                  <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SERVICE_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Preferred Date</Label><DatePicker value={form.preferred_date} onChange={(val) => setForm({ ...form, preferred_date: val })} /></div>
                <div>
                  <Label>Window</Label>
                  <Select value={form.preferred_window} onValueChange={(v) => setForm({ ...form, preferred_window: v as TimeWindow })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Morning (8-12)</SelectItem>
                      <SelectItem value="afternoon">Afternoon (12-4)</SelectItem>
                      <SelectItem value="evening">Evening (4-8)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Bedrooms</Label><Input type="number" value={form.home_bedrooms} onChange={(e) => setForm({ ...form, home_bedrooms: e.target.value })} /></div>
                <div><Label>Bathrooms</Label><Input type="number" value={form.home_bathrooms} onChange={(e) => setForm({ ...form, home_bathrooms: e.target.value })} /></div>
                <div><Label>Sq ft</Label><Input type="number" value={form.home_size_sqft} onChange={(e) => setForm({ ...form, home_size_sqft: e.target.value })} /></div>
              </div>
              <div>
                <Label>Condition</Label>
                <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="well_maintained">Well Maintained</SelectItem>
                    <SelectItem value="average">Average</SelectItem>
                    <SelectItem value="heavy_clean_needed">Heavy Clean Needed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={form.has_pets} onCheckedChange={(c) => setForm({ ...form, has_pets: !!c })} />
                <Label>Has Pets</Label>
              </div>
              <div>
                <Label>Add-ons</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {ADD_ON_OPTIONS.map((opt) => (
                    <div key={opt.value} className="flex items-center gap-2">
                      <Checkbox
                        checked={form.add_ons.includes(opt.value)}
                        onCheckedChange={(c) => {
                          setForm({
                            ...form,
                            add_ons: c
                              ? [...form.add_ons, opt.value]
                              : form.add_ons.filter((a) => a !== opt.value),
                          });
                        }}
                      />
                      <Label className="text-sm">{opt.label}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <div><Label>Quoted Price ($)</Label><Input type="number" step="0.01" value={form.quoted_price} onChange={(e) => setForm({ ...form, quoted_price: e.target.value })} /></div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={handleSubmit} className="w-full">Create Lead</Button>
            </div>
          </SheetContent>
        </Sheet>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'new', 'contacted', 'quoted', 'converted', 'lost'].map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(s)}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Quoted</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">No leads found</TableCell></TableRow>
              ) : (
                filtered.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="text-xs">{format(new Date(lead.created_at), 'MMM d')}</TableCell>
                    <TableCell className="text-xs capitalize">{lead.source}</TableCell>
                    <TableCell className="text-sm font-medium">{lead.customer_name ?? '—'}</TableCell>
                    <TableCell className="text-xs">{lead.customer_phone ?? '—'}</TableCell>
                    <TableCell className="text-xs">{lead.city ?? '—'}</TableCell>
                    <TableCell className="text-xs">{lead.service_type ? SERVICE_TYPE_LABELS[lead.service_type] : '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`border-0 text-xs ${LEAD_STATUS_COLORS[lead.status] ?? ''}`}>
                        {lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{lead.quoted_price ? `$${lead.quoted_price}` : '—'}</TableCell>
                    <TableCell>
                      <Link href={`/wegettinmoneynga/leads/${lead.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
