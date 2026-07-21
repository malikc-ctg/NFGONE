'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Package, CheckCircle2 } from 'lucide-react';

interface SupplyCheckProps {
  onConfirmed: () => void;
  bringsOwnSupplies?: boolean;
}

const STANDARD_SUPPLIES = [
  { id: 'vacuum', label: 'Vacuum / Mop', emoji: '🧹' },
  { id: 'solutions', label: 'Cleaning Solutions', emoji: '🧴' },
  { id: 'cloths', label: 'Microfiber Cloths', emoji: '🧽' },
  { id: 'trash_bags', label: 'Trash Bags', emoji: '🗑️' },
  { id: 'gloves', label: 'Gloves', emoji: '🧤' },
  { id: 'scrub_brush', label: 'Scrub Brush / Sponge', emoji: '🪣' },
];

const COMPANY_SUPPLIES = [
  { id: 'kit_received', label: 'Supply Kit Received', emoji: '📦' },
  { id: 'all_items_present', label: 'All Items Present', emoji: '✅' },
  { id: 'damage_report', label: 'No Equipment Damage', emoji: '🔧' },
];

export function SupplyCheck({ onConfirmed, bringsOwnSupplies = false }: SupplyCheckProps) {
  const supplies = bringsOwnSupplies ? STANDARD_SUPPLIES : COMPANY_SUPPLIES;
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    supplies.forEach(s => { init[s.id] = false; });
    return init;
  });

  const allChecked = supplies.every(s => checked[s.id]);
  const checkedCount = supplies.filter(s => checked[s.id]).length;

  return (
    <Card className="border-purple-200 dark:border-purple-800 overflow-hidden">
      <CardHeader className="pb-2 bg-purple-50 dark:bg-purple-900/20">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-purple-100 dark:bg-purple-900/40 rounded-full p-1.5">
              <Package className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="font-bold text-sm">Supply Check</p>
              <p className="text-[10px] text-muted-foreground font-normal">Confirm you have everything needed</p>
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground font-medium">
            {checkedCount}/{supplies.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-2">
        {supplies.map(item => (
          <label
            key={item.id}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer min-h-[48px] ${
              checked[item.id]
                ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800'
                : 'bg-muted/30 border border-transparent hover:bg-muted/50'
            }`}
          >
            <Checkbox
              checked={checked[item.id]}
              onCheckedChange={(c) => setChecked(prev => ({ ...prev, [item.id]: !!c }))}
            />
            <span className="text-lg">{item.emoji}</span>
            <span className={`text-sm font-medium ${checked[item.id] ? 'text-purple-700 dark:text-purple-300' : ''}`}>
              {item.label}
            </span>
            {checked[item.id] && (
              <CheckCircle2 className="h-4 w-4 text-purple-600 dark:text-purple-400 ml-auto" />
            )}
          </label>
        ))}

        <Button
          onClick={onConfirmed}
          disabled={!allChecked}
          className="w-full h-12 mt-2 bg-purple-600 hover:bg-purple-700 text-white font-bold"
        >
          {allChecked ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              All Supplies Confirmed — Start Job
            </>
          ) : (
            `Confirm All ${supplies.length} Items to Continue`
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
