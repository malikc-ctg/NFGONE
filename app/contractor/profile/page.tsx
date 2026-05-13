'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { User, MapPin, Phone, Mail, CheckCircle2 } from 'lucide-react';
import type { Contractor, Zone } from '@/types';

export default function ContractorProfilePage() {
  const [contractor, setContractor] = useState<Contractor & { selected_zone_ids?: string[] } | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    zone_ids: [] as string[],
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [meRes, zonesRes] = await Promise.all([
          fetch('/api/contractors/me'),
          fetch('/api/zones'),
        ]);

        if (!meRes.ok) throw new Error('Could not fetch profile');
        const meData = await meRes.json();
        setContractor(meData);
        setFormData({
          full_name: meData.full_name || '',
          phone: meData.phone || '',
          zone_ids: meData.selected_zone_ids || [],
        });

        const zonesData = await zonesRes.json();
        setZones(Array.isArray(zonesData) ? zonesData : []);
      } catch (err: any) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/contractors/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to update profile');
      toast.success('Profile updated successfully');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  function toggleZone(zoneId: string) {
    setFormData(prev => ({
      ...prev,
      zone_ids: prev.zone_ids.includes(zoneId)
        ? prev.zone_ids.filter(id => id !== zoneId)
        : [...prev.zone_ids, zoneId]
    }));
  }

  if (loading) return <div className="p-4 text-muted-foreground">Loading profile...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <User className="h-5 w-5 text-blue-600" />
        <h1 className="text-xl font-bold">My Profile</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 pb-10">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email (Read-only)</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  value={contractor?.email || ''}
                  className="pl-10 bg-muted cursor-not-allowed"
                  disabled
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Service Coverage
          </h2>
          <p className="text-xs text-muted-foreground">
            Select all regions where you are available to work. You will receive job offers from any of these areas.
          </p>
          
          <div className="grid gap-3">
            {zones.map((zone) => {
              const isSelected = formData.zone_ids.includes(zone.id);
              return (
                <Card 
                  key={zone.id} 
                  className={`transition-all cursor-pointer border-l-4 ${
                    isSelected 
                      ? 'border-l-blue-600 bg-blue-50/30 dark:bg-blue-900/10' 
                      : 'border-l-transparent hover:border-l-muted'
                  }`}
                  onClick={() => toggleZone(zone.id)}
                >
                  <CardContent className="p-4 flex items-start gap-4">
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={() => toggleZone(zone.id)}
                        className="mt-1"
                      />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex justify-between items-center">
                        <p className="font-bold text-sm">{zone.name}</p>
                        {isSelected && (
                          <CheckCircle2 className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                        {zone.city}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Array.isArray(zone.areas) && zone.areas.map(area => (
                          <span key={`${zone.id}-${area}`} className="text-[9px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground border border-border/50">
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

        </div>

        <div className="sticky bottom-4 pt-4 bg-background/80 backdrop-blur-sm z-10">
          <Button type="submit" className="w-full h-14 text-base font-bold shadow-lg shadow-blue-500/20" disabled={saving}>
            {saving ? 'Saving Changes...' : `Save ${formData.zone_ids.length} Zones`}
          </Button>
        </div>
      </form>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Account Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-[10px] text-muted-foreground font-bold uppercase">Rating</p>
              <p className="text-lg font-bold">{contractor?.score || '5.0'}</p>
            </div>
            <div className="p-3 bg-muted rounded-lg text-center">
              <p className="text-[10px] text-muted-foreground font-bold uppercase">Tier</p>
              <p className="text-lg font-bold capitalize">{contractor?.tier || 'Basic'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
