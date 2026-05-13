'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Clock, DollarSign, MapPin } from 'lucide-react';
import { SERVICE_TYPE_LABELS, TIME_WINDOW_LABELS } from '@/types';
import type { Job, JobOffer } from '@/types';
import Link from 'next/link';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function ContractorDashboard() {
  const [todaysJobs, setTodaysJobs] = useState<Job[]>([]);
  const [pendingOffers] = useState<JobOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const today = format(new Date(), 'yyyy-MM-dd');
        const [jobsRes] = await Promise.all([
          fetch(`/api/jobs?date=${today}`),
        ]);
        const jobsData = await jobsRes.json();
        setTodaysJobs(Array.isArray(jobsData) ? jobsData : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header card */}
      <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white border-0">
        <CardContent className="p-5">
          <p className="text-blue-100 text-sm">{format(new Date(), 'EEEE, MMMM d')}</p>
          <h1 className="text-xl font-bold mt-1">Welcome back</h1>
        </CardContent>
      </Card>

      {/* Pending Offers */}
      {pendingOffers.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Pending Offers</h2>
          {pendingOffers.map((offer) => (
            <Card key={offer.id} className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/20">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{offer.job ? SERVICE_TYPE_LABELS[offer.job.service_type] : 'Cleaning'}</p>
                    <p className="text-xs text-muted-foreground">{offer.job?.city}</p>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700 border-0">Offer</Badge>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{offer.job ? TIME_WINDOW_LABELS[offer.job.scheduled_window] : ''}</span>
                  <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />${offer.job?.quoted_price ? (offer.job.quoted_price * 0.7).toFixed(0) : '—'}</span>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1 h-12 bg-green-600 hover:bg-green-700" onClick={async () => {
                    await fetch(`/api/offers/${offer.id}/respond`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'accept' }),
                    });
                    toast.success('Offer accepted!');
                    window.location.reload();
                  }}>Accept</Button>
                  <Button variant="outline" className="flex-1 h-12" onClick={async () => {
                    await fetch(`/api/offers/${offer.id}/respond`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'decline' }),
                    });
                    toast.info('Offer declined');
                    window.location.reload();
                  }}>Decline</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Today's jobs */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Today&apos;s Jobs</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : todaysJobs.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No jobs scheduled for today.</p>
            </CardContent>
          </Card>
        ) : (
          todaysJobs.map((job) => (
            <Link key={job.id} href={`/contractor/jobs/${job.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <Badge variant="outline" className="mb-2 text-xs">
                        {TIME_WINDOW_LABELS[job.scheduled_window]}
                      </Badge>
                      <p className="font-medium text-sm">{SERVICE_TYPE_LABELS[job.service_type]}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />{job.address_line1}
                      </p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={job.status} />
                      <p className="text-sm font-bold mt-2">${(job.quoted_price * 0.7).toFixed(0)}</p>
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
