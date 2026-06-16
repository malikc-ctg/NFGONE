'use client';

import { useEffect, useState, useMemo } from 'react';
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
import { AvailabilityModal } from '@/components/contractor/AvailabilityModal';

interface ReviewData {
  id: string;
  rating: number;
  was_on_time: boolean | null;
  job_completed_properly: boolean | null;
  public_comment: string | null;
  created_at: string;
  job?: { job_number: string; service_type: string; scheduled_date: string };
}

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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
    max_radius: 30,
  });
  const [hqCoords, setHqCoords] = useState<{lat: number, lng: number} | null>(null);

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
        const parsedNotes = meData.notes ? JSON.parse(meData.notes) : {};
        setFormData({
          full_name: meData.full_name || '',
          phone: meData.phone || '',
          zone_ids: meData.selected_zone_ids || [],
          max_radius: parsedNotes.max_radius || 30,
        });
        if (parsedNotes.hq_coords) {
          setHqCoords(parsedNotes.hq_coords);
        }

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

  const eligibleZones = useMemo(() => {
    if (!hqCoords || zones.length === 0) return [];
    const distances = zones.map(zone => {
      if (!zone.latitude || !zone.longitude) return { zone, distance: Infinity };
      return { zone, distance: getDistanceFromLatLonInKm(hqCoords.lat, hqCoords.lng, zone.latitude, zone.longitude) };
    });
    return distances.filter(d => d.distance <= formData.max_radius).sort((a, b) => a.distance - b.distance);
  }, [hqCoords, zones, formData.max_radius]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const finalZoneIds = eligibleZones.map(z => z.zone.id);
    try {
      const res = await fetch('/api/contractors/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, zone_ids: finalZoneIds }),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      toast.success('Profile updated successfully');
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="p-4 text-muted-foreground">Loading profile...</div>;

  const badges = contractor ? getBadges(contractor, totalCompleted, reviews) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
            <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">My Profile</h1>
        </div>
      </div>

      {/* Performance Card */}
      <Card className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 text-white border-0 shadow-lg shadow-indigo-500/20 overflow-hidden relative">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white blur-2xl rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>
        <div className="absolute inset-0 bg-black/5 backdrop-blur-[1px]" />
        
        <CardHeader className="pb-2 relative z-10">
          <CardTitle className="text-xs font-bold text-indigo-100 uppercase tracking-widest flex items-center gap-2 drop-shadow-sm">
            <TrendingUp className="h-3.5 w-3.5" /> Performance metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 relative z-10">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center bg-white/10 rounded-xl p-3 backdrop-blur-md border border-white/10 shadow-inner">
              <div className="flex items-center justify-center gap-0.5">
                <Star className="h-4 w-4 text-amber-300 fill-amber-300 drop-shadow-sm" />
                <span className="text-2xl font-black">{contractor?.score?.toFixed(1) || '5.0'}</span>
              </div>
              <p className="text-[9px] text-indigo-200 font-bold uppercase tracking-widest mt-1">Rating</p>
            </div>
            <div className="text-center bg-white/10 rounded-xl p-3 backdrop-blur-md border border-white/10 shadow-inner">
              <p className="text-2xl font-black">{totalCompleted}</p>
              <p className="text-[9px] text-indigo-200 font-bold uppercase tracking-widest mt-1">Completed</p>
            </div>
            <div className="text-center bg-white/10 rounded-xl p-3 backdrop-blur-md border border-white/10 shadow-inner">
              <p className="text-xl font-black capitalize mt-0.5">{contractor?.tier || 'Basic'}</p>
              <p className="text-[9px] text-indigo-200 font-bold uppercase tracking-widest mt-1">Tier</p>
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

      {/* Availability Settings Modal */}
      <div className="py-2">
        <AvailabilityModal />
      </div>

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
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Max Travel Radius</Label>
                  <span className="font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded text-sm">
                    {formData.max_radius} km
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={formData.max_radius}
                  onChange={(e) => setFormData({ ...formData, max_radius: parseInt(e.target.value) })}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <p className="text-xs text-muted-foreground">Adjust the slider to automatically determine which zones you can cover.</p>
              </div>

              {hqCoords ? (
                <div className="pt-2 border-t">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-tighter mb-2 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" /> Eligible Zones ({eligibleZones.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {eligibleZones.length > 0 ? (
                      eligibleZones.map(({ zone, distance }) => (
                        <Badge key={zone.id} variant="secondary" className="text-[10px] py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {zone.name} ({distance.toFixed(1)}km)
                        </Badge>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No zones found within this radius.</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-amber-600 italic">Headquarters address not found. Please contact support.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="sticky bottom-4 pt-4 bg-background/80 backdrop-blur-sm z-10">
          <Button type="submit" className="w-full h-14 text-base font-bold shadow-lg shadow-blue-500/20" disabled={saving}>
            {saving ? 'Saving Changes...' : 'Save Profile & Coverage'}
          </Button>
        </div>
      </form>
    </div>
  );
}
