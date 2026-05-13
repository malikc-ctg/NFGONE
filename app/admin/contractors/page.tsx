'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Star } from 'lucide-react';
import { toast } from 'sonner';
import type { Contractor } from '@/types';
import Link from 'next/link';

export default function ContractorsPage() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [zones, setZones] = useState<any[]>([]);
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', zone_id: '',
    tier: 'basic', payout_rate: '0.700',
    brings_own_supplies: false, has_vehicle: true, max_jobs_per_day: '2',
  });

  async function fetchContractors() {
    const res = await fetch('/api/contractors');
    const data = await res.json();
    setContractors(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    fetchContractors();
    fetch('/api/zones').then(r => r.json()).then(d => setZones(Array.isArray(d) ? d : []));
  }, []);

  async function handleSubmit() {
    try {
      const res = await fetch('/api/contractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          payout_rate: parseFloat(form.payout_rate),
          max_jobs_per_day: parseInt(form.max_jobs_per_day),
          zone_id: form.zone_id || null,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Contractor created');
      setDrawerOpen(false);
      fetchContractors();
    } catch { toast.error('Failed to create contractor'); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contractors</h1>
          <p className="text-muted-foreground">{contractors.length} contractors</p>
        </div>
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Contractor</Button></SheetTrigger>
          <SheetContent className="w-[420px] overflow-y-auto">
            <SheetHeader><SheetTitle>New Contractor</SheetTitle></SheetHeader>
            <div className="space-y-4 mt-6">
              <div><Label>Full Name</Label><Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Zone</Label>
                <Select value={form.zone_id} onValueChange={v => setForm({ ...form, zone_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select zone" /></SelectTrigger>
                  <SelectContent>{zones.map(z => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Tier</Label>
                <Select value={form.tier} onValueChange={v => setForm({ ...form, tier: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Payout Rate (%)</Label><Input value={form.payout_rate} onChange={e => setForm({ ...form, payout_rate: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Checkbox checked={form.brings_own_supplies} onCheckedChange={c => setForm({ ...form, brings_own_supplies: !!c })} /><Label>Brings Own Supplies</Label></div>
              <div className="flex items-center gap-2"><Checkbox checked={form.has_vehicle} onCheckedChange={c => setForm({ ...form, has_vehicle: !!c })} /><Label>Has Vehicle</Label></div>
              <Button onClick={handleSubmit} className="w-full">Create Contractor</Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Zone</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Supplies</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : contractors.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No contractors yet</TableCell></TableRow>
              ) : contractors.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.full_name}</TableCell>
                  <TableCell className="text-xs">{c.phone}</TableCell>
                  <TableCell className="text-xs">{(c as any).zone?.name ?? '—'}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize text-xs">{c.tier}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className={`text-xs capitalize ${c.status === 'active' ? 'bg-green-100 text-green-700' : c.status === 'probation' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{c.status}</Badge></TableCell>
                  <TableCell className="text-xs"><Star className="h-3 w-3 inline mr-1 text-amber-500" />{c.score}</TableCell>
                  <TableCell className="text-xs">{(c.payout_rate * 100).toFixed(0)}%</TableCell>
                  <TableCell className="text-xs">{c.brings_own_supplies ? '✓' : '—'}</TableCell>
                  <TableCell><Link href={`/admin/contractors/${c.id}`}><Button variant="ghost" size="sm">View</Button></Link></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
