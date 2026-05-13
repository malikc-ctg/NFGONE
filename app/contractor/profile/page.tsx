'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { User, MapPin, Phone, Mail } from 'lucide-react';
import type { Contractor, Zone } from '@/types';

export default function ContractorProfilePage() {
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    zone_id: '',
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
          zone_id: meData.zone_id || '',
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

  if (loading) return <div className="p-4 text-muted-foreground">Loading profile...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <User className="h-5 w-5 text-blue-600" />
        <h1 className="text-xl font-bold">My Profile</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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

        <Card className="border-blue-100 bg-blue-50/30 dark:border-blue-900/30 dark:bg-blue-900/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Service Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground mb-2">
              Select the zone where you would like to receive job offers. You will only see jobs dispersed within this area.
            </p>
            <div className="space-y-2">
              <Label>Primary Working Zone</Label>
              <Select
                value={formData.zone_id}
                onValueChange={(val) => setFormData({ ...formData, zone_id: val })}
              >
                <SelectTrigger className="bg-white dark:bg-background">
                  <SelectValue placeholder="Select a zone" />
                </SelectTrigger>
                <SelectContent>
                  {zones.map((zone) => (
                    <SelectItem key={zone.id} value={zone.id}>
                      {zone.name} ({zone.city})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full h-12 text-base font-bold" disabled={saving}>
          {saving ? 'Saving Changes...' : 'Update Profile'}
        </Button>
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
