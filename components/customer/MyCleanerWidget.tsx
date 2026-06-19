import { User, Star, MessageSquare } from 'lucide-react';

interface MyCleanerWidgetProps {
  contractor: any;
}

export function MyCleanerWidget({ contractor }: MyCleanerWidgetProps) {
  if (!contractor) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <User className="h-4 w-4 text-blue-600" />
          Your Cleaner
        </h3>
      </div>
      <div className="p-5 flex flex-col items-center justify-center flex-1 text-center">
        <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3 shadow-inner">
          <User className="h-8 w-8" />
        </div>
        <h4 className="font-bold text-lg text-slate-900 leading-tight">{contractor.full_name}</h4>
        <div className="flex items-center justify-center gap-1 mt-1 text-amber-500">
          <Star className="h-3 w-3 fill-amber-500" />
          <Star className="h-3 w-3 fill-amber-500" />
          <Star className="h-3 w-3 fill-amber-500" />
          <Star className="h-3 w-3 fill-amber-500" />
          <Star className="h-3 w-3 fill-amber-500" />
          <span className="text-xs text-slate-500 ml-1">(5.0)</span>
        </div>
        <p className="text-xs text-slate-500 my-3 italic px-2">
          &ldquo;{(() => {
            try {
              return JSON.parse(contractor.notes || '{}').bio || 'Dedicated professional cleaner committed to making your home sparkle.';
            } catch {
              return 'Dedicated professional cleaner committed to making your home sparkle.';
            }
          })()}&rdquo;
        </p>
        <a href={`sms:${contractor.phone}`} className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm">
          <MessageSquare className="h-4 w-4" /> Message
        </a>
      </div>
    </div>
  );
}
