'use client';

import { useRef } from 'react';
import { useFadeIn } from '@/lib/motion/hooks';

const comparisonData = [
  {
    feature: 'Qualified Job Opportunities',
    seaOfBlue: '✓',
    leadPlatforms: 'Partial',
    goingSolo: '✕',
  },
  {
    feature: 'No Cold Calling Required',
    seaOfBlue: '✓',
    leadPlatforms: '✕',
    goingSolo: '✕',
  },
  {
    feature: 'No Cost Per Lead',
    seaOfBlue: '✓',
    leadPlatforms: '✕',
    goingSolo: '✕',
  },
  {
    feature: 'Dedicated Dispatch Support',
    seaOfBlue: '✓',
    leadPlatforms: '✕',
    goingSolo: '✕',
  },
  {
    feature: 'Flexible Work Volume',
    seaOfBlue: '✓',
    leadPlatforms: 'Partial',
    goingSolo: '✕',
  },
  {
    feature: 'Keep Your Existing Business',
    seaOfBlue: '✓',
    leadPlatforms: '✓',
    goingSolo: '✓',
  },
];

export function ContractorComparison() {
  const tableRef = useRef<HTMLDivElement>(null);
  useFadeIn(tableRef, { y: 60 });

  return (
    <section
      id="comparison"
      className="relative py-32 md:py-48 overflow-hidden"
      style={{ backgroundColor: '#001a36' }}
    >
      <div className="container max-w-6xl mx-auto px-6 relative z-10">
        <div className="mb-20 text-center">
          <p className="text-white/40 text-sm tracking-[0.3em] uppercase mb-6">
            Contractor Network
          </p>
          <h2 className="font-rustic text-white text-4xl md:text-6xl leading-tight mb-6">
            Built For Contractors Who Want To Grow
          </h2>
          <p className="text-white/60 text-xl md:text-2xl font-light">
            Less time chasing leads. More time doing the work.
          </p>
        </div>

        <div ref={tableRef} className="w-full overflow-x-auto pb-8">
          <div className="min-w-[800px]">
            {/* Header */}
            <div className="grid grid-cols-4 gap-4 border-b border-white/10 pb-6 mb-6 text-sm uppercase tracking-widest text-white/50">
              <div className="col-span-1 pl-6">Feature</div>
              <div className="col-span-1 text-center font-bold text-white">Sea of Blue</div>
              <div className="col-span-1 text-center">Lead Platforms</div>
              <div className="col-span-1 text-center">Going Solo</div>
            </div>

            {/* Rows */}
            <div className="space-y-4">
              {comparisonData.map((row, index) => (
                <div 
                  key={index} 
                  className="grid grid-cols-4 gap-4 items-center py-6 px-6 bg-white/5 rounded-sm hover:bg-white/10 transition-colors duration-300"
                >
                  <div className="col-span-1 text-white/90 text-lg font-medium">{row.feature}</div>
                  <div className="col-span-1 text-center text-[#4ade80] text-2xl font-bold">{row.seaOfBlue}</div>
                  <div className="col-span-1 text-center text-white/40 text-lg">{row.leadPlatforms}</div>
                  <div className="col-span-1 text-center text-white/40 text-lg">{row.goingSolo}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
