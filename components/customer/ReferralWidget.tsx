'use client';

import { useState } from 'react';
import { Gift, Copy, CheckCircle2 } from 'lucide-react';

interface ReferralWidgetProps {
  customerId: string;
}

export function ReferralWidget({ customerId }: ReferralWidgetProps) {
  const [copied, setCopied] = useState(false);
  
  // Generate a simple code based on ID
  const refCode = `SOB-${customerId.substring(0, 6).toUpperCase()}`;
  const shareText = `Use my code ${refCode} to get $50 off your first Sea of Blue cleaning!`;

  function handleCopy() {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-gradient-to-br from-[#001a36] to-[#022850] rounded-2xl border border-[#001a36] shadow-lg overflow-hidden text-white flex flex-col relative group">
      {/* Background Graphic */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3 pointer-events-none group-hover:bg-blue-400/30 transition-colors" />
      
      <div className="p-5 flex-1 flex flex-col justify-center relative z-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Gift className="h-5 w-5 text-blue-300" />
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight">Give $50, Get $50</h3>
            <p className="text-sm text-blue-200">Refer a friend today</p>
          </div>
        </div>

        <p className="text-xs text-blue-100/80 mb-4 leading-relaxed">
          Share your unique code. When your friend books their first service, they get $50 off, and you earn a $50 credit!
        </p>

        <div className="mt-auto">
          <button 
            onClick={handleCopy}
            className="w-full flex items-center justify-between bg-white/10 hover:bg-white/20 border border-white/20 transition-colors py-2.5 px-4 rounded-xl backdrop-blur-sm"
          >
            <span className="font-mono font-bold tracking-wider">{refCode}</span>
            {copied ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-blue-200" />}
          </button>
        </div>
      </div>
    </div>
  );
}
