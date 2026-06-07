'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { Zone } from '@/types';

export default function SettingsPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [newZone, setNewZone] = useState({ name: '', city: '' });

  useEffect(() => {
    fetch('/api/zones').then(r => r.json()).then(d => setZones(Array.isArray(d) ? d : []));
  }, []);

  async function addZone() {
    if (!newZone.name || !newZone.city) { toast.error('Name and city required'); return; }
    const res = await fetch('/api/zones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newZone),
    });
    if (res.ok) {
      const zone = await res.json();
      setZones([...zones, zone]);
      setNewZone({ name: '', city: '' });
      toast.success('Zone added');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">System configuration</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Service Zones</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {zones.map(z => (
              <Badge key={z.id} variant="outline" className="px-3 py-1.5">
                {z.name} ({z.city})
              </Badge>
            ))}
            {zones.length === 0 && <p className="text-sm text-muted-foreground">No zones yet</p>}
          </div>
          <Separator />
          <div className="flex gap-3 items-end">
            <div><Label>Zone Name</Label><Input value={newZone.name} onChange={e => setNewZone({ ...newZone, name: e.target.value })} placeholder="e.g. North York" /></div>
            <div><Label>City</Label><Input value={newZone.city} onChange={e => setNewZone({ ...newZone, city: e.target.value })} placeholder="e.g. Toronto" /></div>
            <Button onClick={addZone}><Plus className="h-4 w-4 mr-1" />Add</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Default Pricing (CAD)</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span>Standard Clean</span><span className="font-medium">$180</span></div>
          <div className="flex justify-between"><span>Deep Clean</span><span className="font-medium">$280</span></div>
          <div className="flex justify-between"><span>Move-In Clean</span><span className="font-medium">$350</span></div>
          <div className="flex justify-between"><span>Move-Out Clean</span><span className="font-medium">$350</span></div>
          <div className="flex justify-between"><span>Recurring Standard</span><span className="font-medium">$160</span></div>
          <div className="flex justify-between"><span>Recurring Deep</span><span className="font-medium">$250</span></div>
        </CardContent>
      </Card>
    </div>
  );
}
