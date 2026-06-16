import { Calendar, ChevronRight, MapPin, Plus, ShieldCheck, FileText, Clock, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { SERVICE_TYPE_LABELS, TIME_WINDOW_LABELS } from '@/types';

export default async function CustomerPortalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/customer-site/login');
  }

  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('profile_id', user.id)
    .single();

  if (!customer) {
    redirect('/customer-site/onboarding');
  }

  const { data: upcomingJobs } = await supabase
    .from('jobs')
    .select('*, contractor:contractors(*)')
    .eq('customer_id', customer.id)
    .in('status', ['confirmed', 'assigned', 'on_the_way', 'in_progress'])
    .order('scheduled_date', { ascending: true })
    .limit(1);

  const { data: pendingJobs } = await supabase
    .from('jobs')
    .select('*, contractor:contractors(*)')
    .eq('customer_id', customer.id)
    .in('status', ['lead_received', 'quoted', 'deposit_paid'])
    .order('created_at', { ascending: false });

  const { data: pastJobs } = await supabase
    .from('jobs')
    .select('*, contractor:contractors(*)')
    .eq('customer_id', customer.id)
    .in('status', ['completed', 'cancelled'])
    .order('scheduled_date', { ascending: false })
    .limit(5);

  const nextJob = upcomingJobs?.[0];
  const isLive = nextJob && ['on_the_way', 'in_progress'].includes(nextJob.status);

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-64px)] py-12">
      <div className="container max-w-6xl mx-auto px-6">
        
        {/* Welcome & Quick Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome back, {customer.full_name?.split(' ')[0]}</h1>
            <p className="text-slate-500">{customer.address_line1}, {customer.city} • Customer Dashboard</p>
          </div>
          <div className="flex gap-3">
            <button className="bg-white text-[#001a36] border border-slate-200 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition-colors shadow-sm text-sm flex items-center gap-2">
              <FileText className="h-4 w-4" /> My Invoices
            </button>
            <Link href="/customer-site/quote">
              <button className="bg-[#001a36] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#022850] transition-colors shadow-sm text-sm flex items-center gap-2">
                <Plus className="h-4 w-4" /> Request Quote
              </button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Pool Health & Live Tracking */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Live Tracking Banner */}
            {isLive && (
              <div className="bg-[#001a36] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Subtle background graphic */}
                <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 px-2 py-1 rounded bg-blue-500/20 text-blue-200 text-xs font-bold uppercase tracking-wider mb-3">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400"></span>
                    </span>
                    Live Service
                  </div>
                  <h2 className="text-2xl font-bold mb-1">Your technician is en route</h2>
                  <p className="text-blue-100/70">Estimated arrival: {new Date(nextJob.scheduled_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
                
                <button className="bg-white text-[#001a36] px-6 py-3 rounded-xl font-semibold w-full md:w-auto relative z-10 flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
                  <MapPin className="h-4 w-4" />
                  Track Live
                </button>
              </div>
            )}

            {/* Active Quotes & Pending Actions */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">Pending Actions & Quotes</h3>
              {pendingJobs && pendingJobs.length > 0 ? (
                <div className="space-y-4">
                  {pendingJobs.map((job: any) => (
                    <div key={job.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-md text-xs font-semibold capitalize">
                            {job.status.replace('_', ' ')}
                          </span>
                          <span className="text-sm font-bold text-slate-900">
                            {SERVICE_TYPE_LABELS[job.service_type as keyof typeof SERVICE_TYPE_LABELS] || job.service_type}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500">
                          Requested for {new Date(job.scheduled_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="text-right flex-1 md:flex-none">
                          <div className="text-sm text-slate-500">Quoted Price</div>
                          <div className="text-xl font-bold text-slate-900">${job.quoted_price || '0'}</div>
                        </div>
                        <button className="bg-[#001a36] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#022850] transition-colors shadow-sm text-sm whitespace-nowrap">
                          {job.status === 'quoted' ? 'Review Quote' : 'Pay Deposit'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center">
                  <div className="h-12 w-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-1">All caught up!</h3>
                  <p className="text-sm text-slate-500">You have no pending quotes or actions required.</p>
                </div>
              )}
            </div>

            {/* Service Timeline / Logbook */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">Service Timeline</h3>
              <div className="space-y-4">
                {pastJobs && pastJobs.length > 0 ? pastJobs.map((job: any, idx: number) => (
                  <div key={job.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex gap-6 relative">
                    <div className="hidden sm:flex flex-col items-center">
                      <div className={`h-10 w-10 ${idx === 0 ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'} rounded-full flex items-center justify-center shrink-0 border-4 border-white z-10`}>
                        {idx === 0 ? <ShieldCheck className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
                      </div>
                      {idx !== pastJobs.length - 1 && (
                        <div className="w-0.5 bg-slate-100 h-full absolute top-10 bottom-0 left-11" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-slate-900">{SERVICE_TYPE_LABELS[job.service_type as keyof typeof SERVICE_TYPE_LABELS] || job.service_type}</h4>
                          <p className="text-sm text-slate-500">
                            {job.status === 'completed' ? 'Completed' : 'Cancelled'} 
                            {job.contractor?.full_name ? ` by ${job.contractor.full_name}` : ''} on {new Date(job.scheduled_date).toLocaleDateString()} at {new Date(job.scheduled_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                        </div>
                        <span className={`${job.status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'} px-2.5 py-1 rounded-md text-xs font-semibold capitalize`}>
                          {job.status}
                        </span>
                      </div>
                      {job.notes && (
                        <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                          {job.notes}
                        </p>
                      )}
                    </div>
                  </div>
                )) : (
                  <div className="text-slate-500 text-sm italic">No past services found.</div>
                )}
              </div>
              <button className="w-full mt-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
                View All History
              </button>
            </div>
            
          </div>
          
          {/* Right Column: Quick Stats & Support */}
          <div className="space-y-6">
            
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <h3 className="font-bold text-slate-900">Next Scheduled Service</h3>
              </div>
              <div className="p-5 bg-slate-50 flex items-center gap-4">
                {nextJob ? (
                  <>
                    <div className="h-14 w-14 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-blue-600 uppercase">
                        {new Date(nextJob.scheduled_date).toLocaleString('default', { month: 'short' })}
                      </span>
                      <span className="text-xl font-bold text-slate-900">
                        {new Date(nextJob.scheduled_date).getDate()}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{SERVICE_TYPE_LABELS[nextJob.service_type as keyof typeof SERVICE_TYPE_LABELS] || nextJob.service_type}</div>
                      <div className="text-sm text-slate-500">
                        Scheduled for {new Date(nextJob.scheduled_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-slate-500 text-sm italic">No upcoming services scheduled.</div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5">
              <div className="h-10 w-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3">
                <Star className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-blue-900 mb-1">Need something else?</h3>
              <p className="text-sm text-blue-800/70 mb-4">Our concierge team is available 7 days a week to handle any special requests or emergency repairs.</p>
              <button className="w-full bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors shadow-sm text-sm">
                Message Support
              </button>
            </div>

          </div>
        </div>
        
      </div>
    </div>
  );
}
