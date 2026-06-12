import Link from 'next/link';
import { ArrowRight, CheckCircle2, Shield, Smartphone, Zap } from 'lucide-react';

export default function CustomerLandingPage() {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center pt-16 overflow-hidden">
        {/* Subtle background element */}
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-[800px] h-[800px] bg-blue-50 rounded-full blur-3xl opacity-50 pointer-events-none" />
        
        <div className="container max-w-7xl mx-auto px-6 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Now accepting clients in Ontario
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-6 leading-[1.1]">
              Luxury Home Care. <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#001a36] to-blue-600">
                Automated.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 mb-8 leading-relaxed max-w-xl">
              We&apos;ve redesigned residential cleaning from the ground up. 
              Track your service live, view cleaning reports, and manage everything from your phone.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="bg-[#001a36] text-white px-8 py-4 rounded-xl font-semibold hover:bg-[#022850] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 group">
                Get an Instant Quote
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <Link 
                href="/customer-site/login"
                className="bg-white text-slate-900 border border-slate-200 px-8 py-4 rounded-xl font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center"
              >
                Sign In
              </Link>
            </div>
            
            <div className="mt-10 flex items-center gap-6 text-sm text-slate-500 font-medium">
              <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500"/> Certified Pros</div>
              <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-blue-500"/> Fully Insured</div>
            </div>
          </div>
          
          <div className="relative hidden lg:block h-[600px] w-full rounded-3xl overflow-hidden shadow-2xl border border-slate-100 bg-slate-50">
            {/* Simulated UI/App mockup graphic */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-8">
               <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 flex flex-col h-[500px]">
                 <div className="bg-[#001a36] p-6 text-white pb-12">
                   <div className="text-sm text-white/70 mb-1">Your Home Status</div>
                   <div className="text-4xl font-bold">Pristine</div>
                 </div>
                 <div className="flex-1 bg-slate-50 p-6 -mt-6 rounded-t-3xl flex flex-col gap-4">
                   <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                     <div className="flex justify-between items-center mb-2">
                       <span className="font-semibold text-slate-900">Deep Clean</span>
                       <span className="text-green-600 font-medium text-sm">Completed</span>
                     </div>
                     <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                       <div className="h-full bg-green-500 w-[100%]" />
                     </div>
                   </div>
                   <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-4 items-center">
                     <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                       <Shield className="h-6 w-6 text-blue-600" />
                     </div>
                     <div>
                       <div className="font-semibold text-slate-900">Weekly Service</div>
                       <div className="text-sm text-slate-500">Next visit: Tomorrow</div>
                     </div>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Smart Care Section */}
      <section id="smart-care" className="py-24 bg-slate-50">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Not just another pool guy.</h2>
            <p className="text-lg text-slate-600">
              We leverage proprietary routing technology and a rigorous vetting process to deliver a consistent, luxury experience every single week.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-6">
                <Smartphone className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Live Tracking</h3>
              <p className="text-slate-600 leading-relaxed">
                Know exactly when we arrive. Track your technician&apos;s ETA live on a map, just like a rideshare app. No more waiting around.
              </p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-6">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Digital Logbooks</h3>
              <p className="text-slate-600 leading-relaxed">
                After every service, receive a detailed digital report showing exact cleaning details and before/after photos of your pristine home.
              </p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-6">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Vetted Professionals</h3>
              <p className="text-slate-600 leading-relaxed">
                Only the top 5% of service companies make it onto the Sea of Blue network. Fully insured, background-checked, and highly rated.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing / Tiers */}
      <section id="services" className="py-24 bg-white">
        <div className="container max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Simple, transparent pricing.</h2>
            <p className="text-lg text-slate-600">
              No hidden fees. No surprise charges. Just reliable, professional service.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Standard Tier */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Standard Care</h3>
              <p className="text-slate-500 mb-6">Perfect for maintaining a clean, healthy home.</p>
              <div className="mb-8">
                <span className="text-4xl font-bold text-slate-900">Dynamic</span>
                <span className="text-slate-500"> /quote</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-blue-500 shrink-0"/> <span className="text-slate-600">Weekly vacuuming and dusting</span></li>
                <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-blue-500 shrink-0"/> <span className="text-slate-600">Kitchen & bathroom sanitization</span></li>
                <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-blue-500 shrink-0"/> <span className="text-slate-600">Floor mopping & surface wiping</span></li>
                <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-blue-500 shrink-0"/> <span className="text-slate-600">Digital service reports</span></li>
              </ul>
              <button className="w-full py-3 rounded-xl border-2 border-slate-200 text-slate-900 font-semibold hover:border-[#001a36] hover:bg-slate-50 transition-colors">
                Get a Quote
              </button>
            </div>

            {/* Premium Tier */}
            <div className="bg-[#001a36] p-8 rounded-3xl border border-[#022850] shadow-xl relative overflow-hidden flex flex-col">
              <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">Most Popular</div>
              <h3 className="text-2xl font-bold text-white mb-2">Resort Level</h3>
              <p className="text-white/60 mb-6">The ultimate hands-off luxury experience.</p>
              <div className="mb-8">
                <span className="text-4xl font-bold text-white">Dynamic</span>
                <span className="text-white/60"> /quote</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-blue-400 shrink-0"/> <span className="text-white/90">Everything in Standard Care</span></li>
                <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-blue-400 shrink-0"/> <span className="text-white/90">Priority VIP routing (Morning slots)</span></li>
                <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-blue-400 shrink-0"/> <span className="text-white/90">Deep cleaning focus included</span></li>
                <li className="flex gap-3"><CheckCircle2 className="h-5 w-5 text-blue-400 shrink-0"/> <span className="text-white/90">Carpet spot treatment</span></li>
              </ul>
              <button className="w-full py-3 rounded-xl bg-blue-500 text-white font-semibold hover:bg-blue-400 transition-colors">
                Get a Quote
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
