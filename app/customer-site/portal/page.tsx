import { Calendar, ChevronRight, Droplets, MapPin, Plus, ShieldCheck, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

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
    .in('status', ['scheduled', 'en_route', 'in_progress'])
    .order('scheduled_date', { ascending: true })
    .limit(1);

  const { data: pastJobs } = await supabase
    .from('jobs')
    .select('*, contractor:contractors(*)')
    .eq('customer_id', customer.id)
    .in('status', ['completed', 'cancelled'])
    .order('scheduled_date', { ascending: false })
    .limit(5);

  const nextJob = upcomingJobs?.[0];
  const isLive = nextJob && ['en_route', 'in_progress'].includes(nextJob.status);

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-64px)] py-12">
      <div className="container max-w-6xl mx-auto px-6">
        
        {/* Welcome & Quick Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome back, {customer.full_name?.split(' ')[0]}</h1>
            <p className="text-slate-500">{customer.address_line1}, {customer.city} • Standard Care Plan</p>
          </div>
          <div className="flex gap-3">
            <button className="bg-white text-[#001a36] border border-slate-200 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition-colors shadow-sm text-sm">
              Manage Plan
            </button>
            <button className="bg-[#001a36] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#022850] transition-colors shadow-sm text-sm flex items-center gap-2">
              <Plus className="h-4 w-4" /> Book Extra Service
            </button>
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

            {/* Home Status Score */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-900">Home Cleanliness Score</h3>
                <span className="text-sm text-slate-500">Last updated: Aug 12, 2026</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-1 flex flex-col items-center justify-center border-r border-slate-100">
                  <div className="relative h-32 w-32 mb-4">
                    <svg className="h-full w-full" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="8" strokeDasharray="251" strokeDashoffset="25" strokeLinecap="round" className="transform -rotate-90 origin-center" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold text-slate-900">92</span>
                      <span className="text-xs text-slate-500 uppercase font-medium tracking-wide">Excellent</span>
                    </div>
                  </div>
                </div>
                
                <div className="col-span-2 grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                     <div className="text-sm text-slate-500 mb-1">Kitchen & Baths</div>
                    <div className="text-xl font-bold text-slate-900 flex items-baseline gap-2">
                      Deep Clean <span className="text-sm font-medium text-green-500">Done</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="text-sm text-slate-500 mb-1">Living Areas</div>
                    <div className="text-xl font-bold text-slate-900 flex items-baseline gap-2">
                      Dusted <span className="text-sm font-medium text-green-500">Done</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="text-sm text-slate-500 mb-1">Floors</div>
                    <div className="text-xl font-bold text-slate-900 flex items-baseline gap-2">
                      Mopped <span className="text-sm font-medium text-green-500">Done</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="text-sm text-slate-500 mb-1">Bedrooms</div>
                    <div className="text-xl font-bold text-slate-900 flex items-baseline gap-2">
                      Tidied <span className="text-sm font-medium text-green-500">Done</span>
                    </div>
                  </div>
                </div>
              </div>
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
                          <h4 className="font-bold text-slate-900">Cleaning Service</h4>
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
                      <div className="font-semibold text-slate-900">Cleaning Service</div>
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

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-bold text-slate-900 mb-4">Payment Method</h3>
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-12 bg-[#001a36] rounded text-white text-[10px] font-bold flex items-center justify-center">VISA</div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">•••• 4242</div>
                    <div className="text-xs text-slate-500">Expires 12/28</div>
                  </div>
                </div>
                <button className="text-sm text-blue-600 font-medium hover:underline">Edit</button>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Next billing cycle:</span>
                <span className="font-medium text-slate-900">Sep 1, 2026</span>
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
