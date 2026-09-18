'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Repeat, Calendar, Clock, Sparkles } from 'lucide-react';
import type { Customer, RecurringBooking } from '@/types';
import Link from 'next/link';
import { AddCustomerServiceModal } from '@/components/admin/customers/AddCustomerServiceModal';
import { formatRecurrenceSchedule, DAY_LABELS } from '@/lib/recurring-utils';
import { format12Hour } from '@/lib/time-utils';

export default function CustomerDetailPage() {
  const params = useParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [recurringBookings, setRecurringBookings] = useState<RecurringBooking[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [recurringLoading, setRecurringLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'recurring' | 'one_time'>('recurring');

  const fetchCustomerData = useCallback(async () => {
    // Fetch customer details
    const res = await fetch('/api/customers');
    const data = await res.json();
    const found = (Array.isArray(data) ? data : []).find((c: any) => c.id === params.id);
    setCustomer(found ?? null);

    if (found) {
      // Fetch customer service history
      try {
        const jobsRes = await fetch(`/api/jobs?customer_id=${params.id}`);
        if (jobsRes.ok) {
          const jobsData = await jobsRes.json();
          setJobs(Array.isArray(jobsData) ? jobsData : []);
        }
      } catch (e) {
        console.error('Failed to load service history', e);
      } finally {
        setJobsLoading(false);
      }

      // Fetch recurring agreements
      try {
        const recRes = await fetch(`/api/recurring?customer_id=${params.id}`);
        if (recRes.ok) {
          const recData = await recRes.json();
          setRecurringBookings(Array.isArray(recData) ? recData : []);
        }
      } catch (e) {
        console.error('Failed to load recurring bookings', e);
      } finally {
        setRecurringLoading(false);
      }
    } else {
      setJobsLoading(false);
      setRecurringLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchCustomerData();
  }, [fetchCustomerData]);

  const openAddService = (tab: 'recurring' | 'one_time') => {
    setModalTab(tab);
    setModalOpen(true);
  };

  if (!customer) return <p className="text-muted-foreground p-6">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/sobadmin/customers">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{customer.full_name}</h1>
            <p className="text-xs text-muted-foreground">Customer #{customer.id.substring(0, 8)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => openAddService('recurring')}
            className="bg-blue-600 hover:bg-blue-700 shadow-sm"
            size="sm"
          >
            <Repeat className="h-4 w-4 mr-1.5" />
            Add Recurring Service
          </Button>
          <Button
            onClick={() => openAddService('one_time')}
            variant="outline"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add One-Time Job
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Contact Info</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{customer.email}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{customer.phone}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Address</span><span>{customer.address_line1 ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">City</span><span>{customer.city ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Postal Code</span><span>{customer.postal_code ?? '—'}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Customer Profile & Preferences</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
              <h3 className="font-semibold text-slate-800 text-xs uppercase tracking-wider mb-2">Home Details</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Bedrooms</span><span className="font-medium">{jobs[0]?.home_bedrooms ?? 'Not set'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Bathrooms</span><span className="font-medium">{jobs[0]?.home_bathrooms ?? 'Not set'}</span></div>
                <div className="flex justify-between col-span-2"><span className="text-muted-foreground">Pets</span><span className="font-medium">{jobs.length > 0 ? (jobs[0].has_pets ? 'Yes' : 'No') : 'No'}</span></div>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <span className="text-muted-foreground block mb-1">Entry Instructions</span>
                <span className="text-xs bg-white p-2 rounded block border border-slate-200">{jobs[0]?.access_instructions || 'None provided'}</span>
              </div>
            </div>

            <div className="space-y-3 text-sm bg-blue-50 p-3 rounded-lg border border-blue-100">
              <h3 className="font-semibold text-blue-800 text-xs uppercase tracking-wider mb-2">Referral Program</h3>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Personal Code</span>
                <span className="font-mono bg-white px-2 py-1 rounded border border-blue-200 text-blue-700 font-bold">SOB-{customer.id.substring(0, 6).toUpperCase()}</span>
              </div>
            </div>
            
            <div className="pt-2">
              <h3 className="font-semibold text-slate-800 text-xs uppercase tracking-wider mb-2">Internal Admin Notes</h3>
              <p className="text-xs text-muted-foreground">{customer.notes || 'No admin notes'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recurring Contracts Section */}
      <Card className="border-blue-100 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Recurring Services & Subscriptions</CardTitle>
          </div>
          <Button
            size="sm"
            onClick={() => openAddService('recurring')}
            className="bg-blue-600 hover:bg-blue-700 h-8 text-xs"
          >
            <Repeat className="h-3.5 w-3.5 mr-1" />
            + New Recurring Service
          </Button>
        </CardHeader>
        <CardContent>
          {recurringLoading ? (
            <p className="text-muted-foreground text-sm">Loading recurring services...</p>
          ) : recurringBookings.length === 0 ? (
            <div className="text-center py-6 border border-dashed rounded-lg bg-slate-50/50">
              <Repeat className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">No active recurring contracts</p>
              <p className="text-xs text-muted-foreground mb-3">Customer is not currently enrolled in recurring cleanings.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openAddService('recurring')}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Recurring Clean
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recurringBookings.map((rec) => (
                <div
                  key={rec.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg border border-slate-200 bg-white hover:border-blue-200 transition-colors gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 capitalize text-sm">
                        {rec.service_type?.replace(/_/g, ' ')}
                      </span>
                      <Badge
                        variant={rec.is_active ? 'default' : 'secondary'}
                        className={rec.is_active ? 'bg-emerald-600 text-white text-[10px]' : 'text-[10px]'}
                      >
                        {rec.is_active ? 'Active Contract' : 'Paused'}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] capitalize text-blue-700 border-blue-200">
                        {rec.frequency}
                      </Badge>
                    </div>
                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {rec.days_of_week && rec.days_of_week.length > 0
                          ? rec.days_of_week.map((d: any) => DAY_LABELS[d as keyof typeof DAY_LABELS] || d).join(', ')
                          : 'Custom schedule'}{' '}
                        @ {rec.preferred_start_time ? format12Hour(rec.preferred_start_time) : '9:00 AM'}
                      </span>
                      {rec.employee && (
                        <span>Cleaner: <strong className="text-slate-700">{rec.employee.full_name}</strong></span>
                      )}
                      {rec.next_job_date && (
                        <span>Next Run: <strong className="text-blue-700">{rec.next_job_date}</strong></span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">${rec.quoted_price}<span className="text-xs font-normal text-muted-foreground">/clean</span></p>
                      {rec.monthly_amount && (
                        <p className="text-[10px] text-emerald-600 font-semibold">${rec.monthly_amount} MRR</p>
                      )}
                    </div>
                    <Link href="/sobadmin/recurring">
                      <Button variant="ghost" size="sm" className="h-8 text-xs">Manage</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service History Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg">Service History & Jobs</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openAddService('one_time')}
            className="h-8 text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            + Add One-Time Job
          </Button>
        </CardHeader>
        <CardContent>
          {jobsLoading ? (
            <p className="text-muted-foreground text-sm">Loading service history...</p>
          ) : jobs.length === 0 ? (
            <div className="text-center py-6 border border-dashed rounded-lg bg-slate-50/50">
              <p className="text-sm font-medium text-slate-700">No jobs found for this customer.</p>
              <p className="text-xs text-muted-foreground mb-3">Schedule their first service visit using the button below.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openAddService('one_time')}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Schedule First Clean
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg">Date</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3 rounded-tr-lg text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">{new Date(job.scheduled_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 whitespace-nowrap capitalize">{job.service_type?.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          job.status === 'completed' || job.status === 'paid_out' ? 'bg-green-100 text-green-800' :
                          job.status === 'cancelled' || job.status === 'no_show' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {job.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium">${job.quoted_price}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <Link href={`/sobadmin/jobs/${job.id}`}>
                          <Button variant="ghost" size="sm">View</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Service Modal */}
      <AddCustomerServiceModal
        customer={customer}
        open={modalOpen}
        onOpenChange={setModalOpen}
        defaultTab={modalTab}
        onSuccess={fetchCustomerData}
        initialHomeSpecs={{
          home_bedrooms: jobs[0]?.home_bedrooms,
          home_bathrooms: jobs[0]?.home_bathrooms,
          has_pets: jobs[0]?.has_pets,
          access_instructions: jobs[0]?.access_instructions,
        }}
      />
    </div>
  );
}
