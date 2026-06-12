import { Waves } from 'lucide-react';
import Link from 'next/link';

export default function CustomerLandingPage() {
  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center p-6 text-center">
      <div className="flex items-center justify-center gap-3 mb-8">
        <Waves className="h-10 w-10 text-blue-500" />
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          Sea of Blue
        </h1>
      </div>
      
      <p className="max-w-xl text-lg text-slate-600 mb-10">
        Professional pool and spa services for your home. Book a service, track your jobs, and manage everything from your customer portal.
      </p>

      <div className="flex gap-4">
        <Link 
          href="/customer-site/portal"
          className="rounded-full bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
        >
          Go to Portal
        </Link>
        <Link 
          href="/customer-site/login"
          className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 transition-colors"
        >
          Sign In
        </Link>
      </div>
    </main>
  );
}
