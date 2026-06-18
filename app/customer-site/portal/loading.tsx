import { Skeleton } from '@/components/ui/skeleton';

export default function CustomerPortalLoading() {
  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-12">
      <div className="container max-w-6xl mx-auto px-6">
        
        {/* Welcome & Quick Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="space-y-3">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-32 rounded-lg" />
            <Skeleton className="h-10 w-36 rounded-lg" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Live Tracking & Pending Actions */}
          <div className="lg:col-span-2 space-y-8">
            <Skeleton className="h-32 w-full rounded-2xl" />
            
            <div>
              <Skeleton className="h-6 w-64 mb-4" />
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                    <div className="space-y-3 w-full">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-6 w-24 rounded-md" />
                        <Skeleton className="h-5 w-32" />
                      </div>
                      <Skeleton className="h-4 w-48" />
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <div className="space-y-2 w-full md:w-auto text-right">
                        <Skeleton className="h-4 w-20 ml-auto" />
                        <Skeleton className="h-6 w-16 ml-auto" />
                      </div>
                      <Skeleton className="h-10 w-32 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Skeleton className="h-6 w-48 mb-4" />
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
          </div>

          {/* Right Column: Home Profile & Next Service */}
          <div className="space-y-8">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-[#001a36] px-6 py-4 flex items-center justify-between">
                <Skeleton className="h-6 w-32 bg-slate-400/20" />
                <Skeleton className="h-8 w-8 rounded-full bg-slate-400/20" />
              </div>
              <div className="p-6 space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between items-center border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>

        </div>
      </div>
    </div>
  );
}
