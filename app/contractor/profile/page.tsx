'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  User, MapPin, Phone, Mail, CheckCircle2,
  Star, TrendingUp, Award, Shield, Zap, Clock,
} from 'lucide-react';
import type { Contractor, Zone, ContractorScoreHistory } from '@/types';

interface ReviewData {
  id: string;
  rating: number;
  was_on_time: boolean | null;
  job_completed_properly: boolean | null;
  public_comment: string | null;
  created_at: string;
  job?: { job_number: string; service_type: string; scheduled_date: string };
}

function getBadges(contractor: Contractor, totalCompleted: number, reviews: ReviewData[]): { label: string; icon: React.ReactNode; color: string }[] {
  const badges: { label: string; icon: React.ReactNode; color: string }[] = [];
  if (totalCompleted >= 50) badges.push({ label: 'Veteran', icon: <Award className="h-3 w-3" />, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' });
  else if (totalCompleted >= 10) badges.push({ label: 'Experienced', icon: <Zap className="h-3 w-3" />, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' });
  if (contractor.score >= 4.8) badges.push({ label: '5 Star Streak', icon: <Star className="h-3 w-3" />, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' });
  if (contractor.background_check_cleared) badges.push({ label: 'Verified', icon: <Shield className="h-3 w-3" />, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' });
  const onTimeRate = reviews.filter(r => r.was_on_time).length / Math.max(reviews.length, 1);
  if (reviews.length >= 5 && onTimeRate >= 0.9) badges.push({ label: 'Punctual Pro', icon: <Clock className="h-3 w-3" />, color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' });
  return badges;
}

export default function ContractorProfilePage() {
  const [contractor, setContractor] = useState<Contractor & { selected_zone_ids?: string[] } | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scoreHistory, setScoreHistory] = useState<ContractorScoreHistory[]>([]);
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [totalCompleted, setTotalCompleted] = useState(0);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    zone_ids: [] as string[],
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [meRes, zonesRes, historyRes, statsRes] = await Promise.all([
          fetch('/api/contractors/me'),
          fetch('/api/zones'),
          fetch('/api/contractors/me/score-history'),
          fetch('/api/contractors/me/stats'),
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

        if (historyRes.ok) {
          const hData = await historyRes.json();
          setScoreHistory(hData.score_history || []);
          setReviews(hData.reviews || []);
        }

        if (statsRes.ok) {
          const sData = await statsRes.json();
          setTotalCompleted(sData.total_completed || 0);
        }
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
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
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

  const badges = contractor ? getBadges(contractor, totalCompleted, reviews) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <User className="h-5 w-5 text-blue-600" />
        <h1 className="text-xl font-bold">My Profile</h1>
      </div>

      {/* Performance Card */}
      <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/20 border-indigo-100 dark:border-indigo-900/50 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="flex items-center justify-center gap-0.5">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                <span className="text-xl font-black">{contractor?.score || '5.0'}</span>
              </div>
              <p className="text-[9px] text-muted-foreground font-bold uppercase">Rating</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-black">{totalCompleted}</p>
              <p className="text-[9px] text-muted-foreground font-bold uppercase">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-black capitalize">{contractor?.tier || 'Basic'}</p>
              <p className="text-[9px] text-muted-foreground font-bold uppercase">Tier</p>
            </div>
          </div>

          {/* Badges */}
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {badges.map((b, i) => (
                <Badge key={i} className={`${b.color} border-0 text-[10px] font-bold px-2 py-0.5 gap-1`}>
                  {b.icon} {b.label}
                </Badge>
              ))}
            </div>
          )}

          {/* Score History */}
          {scoreHistory.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Recent Score Changes</p>
              {scoreHistory.slice(0, 5).map(h => (
                <div key={h.id} className="flex items-center justify-between text-xs bg-white/50 dark:bg-black/20 rounded-lg px-3 py-2">
                  <span className="text-muted-foreground">{h.reason || 'Score update'}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">{h.score_before}</span>
                    <span>→</span>
                    <span className={`font-bold ${(h.score_after || 0) >= (h.score_before || 0) ? 'text-green-600' : 'text-red-600'}`}>
                      {h.score_after}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recent Reviews */}
          {reviews.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Recent Reviews</p>
              {reviews.slice(0, 3).map(r => (
                <div key={r.id} className="bg-white/50 dark:bg-black/20 rounded-lg px-3 py-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3 w-3 ${i < r.rating ? 'text-amber-500 fill-amber-500' : 'text-muted'}`} />
                      ))}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  {r.public_comment && <p className="text-xs text-muted-foreground italic">&ldquo;{r.public_comment}&rdquo;</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profile Form */}
      <form onSubmit={handleSubmit} className="space-y-4 pb-10">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="full_name" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} className="pl-10" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (Read-only)</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="email" value={contractor?.email || ''} className="pl-10 bg-muted cursor-not-allowed" disabled />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="pl-10" required />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Service Coverage
          </h2>
          <p className="text-xs text-muted-foreground">Select all regions where you are available to work.</p>
          <div className="grid gap-3">
            {zones.map((zone) => {
              const isSelected = formData.zone_ids.includes(zone.id);
              return (
                <Card key={zone.id} className={`transition-all cursor-pointer border-l-4 ${isSelected ? 'border-l-blue-600 bg-blue-50/30 dark:bg-blue-900/10' : 'border-l-transparent hover:border-l-muted'}`} onClick={() => toggleZone(zone.id)}>
                  <CardContent className="p-4 flex items-start gap-4">
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleZone(zone.id)} className="mt-1" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex justify-between items-center">
                        <p className="font-bold text-sm">{zone.name}</p>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">{zone.city}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Array.isArray(zone.areas) && zone.areas.map(area => (
                          <span key={`${zone.id}-${area}`} className="text-[9px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground border border-border/50">{area}</span>
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
    </div>
  );
}
