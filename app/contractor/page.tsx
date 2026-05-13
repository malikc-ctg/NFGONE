'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { MapPin, Briefcase } from 'lucide-react';
import { SERVICE_TYPE_LABELS, TIME_WINDOW_LABELS } from '@/types';
import type { Job, JobOffer, Contractor } from '@/types';
import Link from 'next/link';
import { format } from 'date-fns';
import { toast } from 'sonner';


export default function ContractorDashboard() {
  const [todaysJobs, setTodaysJobs] = useState<Job[]>([]);
  const [pendingOffers, setPendingOffers] = useState<JobOffer[]>([]);
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      // 1. Get my profile
      const meRes = await fetch('/api/contractors/me');
      if (!meRes.ok) {
        const errorData = await meRes.json();
        throw new Error(errorData.error || 'Could not fetch profile');
      }
      const meData = await meRes.json();

      setContractor(meData);

      // 2. Get today's jobs (assigned to me)
      const today = format(new Date(), 'yyyy-MM-dd');
      const jobsRes = await fetch(`/api/jobs?date=${today}&contractor_id=${meData.id}`);
      const jobsData = await jobsRes.json();
      setTodaysJobs(Array.isArray(jobsData) ? jobsData : []);

      // 3. Get pending offers
      const offersRes = await fetch('/api/offers');
      const offersData = await offersRes.json();
      setPendingOffers(Array.isArray(offersData) ? offersData : []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds to keep offers current
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  async function handleOfferResponse(offerId: string, action: 'accept' | 'decline') {
    setRespondingId(offerId);
    try {
      const res = await fetch(`/api/offers/${offerId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const result = await res.json();

      if (!res.ok) {
        if (res.status === 422) {
          toast.error('This job is no longer available');
        } else {
          throw new Error(result.error || 'Failed to respond');
        }
      } else {
        toast.success(action === 'accept' ? 'Job accepted!' : 'Offer declined');
      }
      
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRespondingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header card */}
      <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0">
        <CardContent className="p-5">
          <p className="text-blue-100 text-sm">{format(new Date(), 'EEEE, MMMM d')}</p>
          <h1 className="text-xl font-bold mt-1">Welcome back, {contractor?.full_name?.split(' ')[0]}</h1>
        </CardContent>
      </Card>

      {/* Pending Offers */}
      {pendingOffers.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Briefcase className="h-4 w-4" /> Available Offers
            </h2>
            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0">
              {pendingOffers.length} New
            </Badge>
          </div>
          {pendingOffers.map((offer) => (
            <Card key={offer.id} className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/20 overflow-hidden">
              <CardContent className="p-4 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg leading-tight">
                      {offer.job ? SERVICE_TYPE_LABELS[offer.job.service_type] : 'Cleaning Job'}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {offer.job?.city}, {offer.job?.postal_code}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-green-600 dark:text-green-400">
                      ${offer.job?.quoted_price ? (offer.job.quoted_price * 0.7).toFixed(0) : '—'}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Your Payout</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 py-2 border-y border-amber-100 dark:border-amber-900/50">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Date</p>
                    <p className="text-sm font-medium">{offer.job ? format(new Date(offer.job.scheduled_date + 'T12:00:00'), 'MMM d, yyyy') : '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Window</p>
                    <p className="text-sm font-medium">{offer.job ? TIME_WINDOW_LABELS[offer.job.scheduled_window] : '—'}</p>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button 
                    className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white font-bold" 
                    disabled={respondingId === offer.id}
                    onClick={() => handleOfferResponse(offer.id, 'accept')}
                  >
                    {respondingId === offer.id ? 'Accepting...' : 'Accept Job'}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 h-12 border-amber-200 hover:bg-amber-100 dark:border-amber-800"
                    disabled={respondingId === offer.id}
                    onClick={() => handleOfferResponse(offer.id, 'decline')}
                  >
                    Decline
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Today's jobs */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Today&apos;s Schedule</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : todaysJobs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-10 text-center space-y-2">
              <div className="bg-muted w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium text-muted-foreground">No jobs scheduled for today.</p>
              <p className="text-xs text-muted-foreground">Accept an available offer above to get started.</p>
            </CardContent>
          </Card>
        ) : (
          todaysJobs.map((job) => (
            <Link key={job.id} href={`/contractor/jobs/${job.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer border-l-4 border-l-blue-600">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0">
                          {TIME_WINDOW_LABELS[job.scheduled_window]}
                        </Badge>
                        <StatusBadge status={job.status} />
                      </div>
                      <p className="font-bold text-base leading-tight">{SERVICE_TYPE_LABELS[job.service_type]}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />{job.address_line1}, {job.city}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">${(job.quoted_price * 0.7).toFixed(0)}</p>
                      <p className="text-[10px] text-muted-foreground font-bold">EARNED</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

