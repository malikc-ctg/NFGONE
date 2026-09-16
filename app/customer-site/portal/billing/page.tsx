import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { FileText, Download, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/customer-site/login');

  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('profile_id', user.id)
    .single();

  const { data: pastJobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('customer_id', customer?.id || '00000000-0000-0000-0000-000000000000')
    .in('status', ['completed'])
    .order('scheduled_date', { ascending: false });

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-64px)] py-12">
      <div className="container max-w-4xl mx-auto px-6">
        
        <Link href="/customer-site/portal" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Billing & Invoices</h1>
        <p className="text-slate-500 mb-8">View your payment history and download receipts for past services.</p>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {pastJobs && pastJobs.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {pastJobs.map((job) => (
                <div key={job.id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{job.service_type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</h4>
                      <p className="text-sm text-slate-500">Service Date: {new Date(job.scheduled_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-4 md:gap-1">
                    <span className="font-bold text-lg text-slate-900">${job.quoted_price}</span>
                    <span className="text-xs font-semibold px-2 py-1 bg-green-50 text-green-700 rounded-md">Paid</span>
                  </div>
                  
                  <button className="w-full md:w-auto mt-2 md:mt-0 bg-white border border-slate-200 text-slate-700 font-medium py-2 px-4 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 text-sm">
                    <Download className="h-4 w-4" /> Receipt
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="h-16 w-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8" />
              </div>
              <h3 className="font-bold text-slate-900 mb-1">No invoices found</h3>
              <p className="text-slate-500">You do not have any past billed services yet.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
