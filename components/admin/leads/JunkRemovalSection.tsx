'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Copy, Truck, Info, Minus, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  calcJunkRemoval,
  JUNK_VOLUME_TIERS,
  type JunkVolume,
} from '@/lib/pricing/junk-removal-calculator';

function fmt(n: number) {
  return `$${n.toFixed(2)}`;
}

export function JunkRemovalSection() {
  const [volume, setVolume] = useState<JunkVolume>('quarter');
  const [heavyMaterials, setHeavyMaterials] = useState(false);
  const [stairsCount, setStairsCount] = useState(0);
  const [appliancesCount, setAppliancesCount] = useState(0);
  const [disassemblyItemCount, setDisassemblyItemCount] = useState(0);

  const result = useMemo(() => {
    return calcJunkRemoval({
      volume,
      heavyMaterials,
      stairsCount,
      appliancesCount,
      disassemblyItemCount,
    });
  }, [volume, heavyMaterials, stairsCount, appliancesCount, disassemblyItemCount]);

  const handleCopy = () => {
    if (!result) return;
    const lines: string[] = ['JUNK REMOVAL & HAULAWAY ESTIMATE', ''];
    lines.push(`Volume: ${result.volumeLabel} (${result.volumeDescription})`);
    lines.push(`Base Pickup Rate: ${fmt(result.basePrice)}`);
    if (result.addOnBreakdown.length > 0) {
      lines.push('');
      lines.push('Modifiers & Surcharges:');
      result.addOnBreakdown.forEach((a) => {
        lines.push(` • ${a.label}: ${fmt(a.price)}`);
      });
    }
    lines.push('—'.repeat(40));
    lines.push(`Total Quote: ${fmt(result.total)}`);
    lines.push(`Estimated Time on Site: ~${result.estimatedLaborMinutes} minutes`);
    navigator.clipboard.writeText(lines.join('\n'));
    toast.success('Junk removal quote copied to clipboard');
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
      {/* ── LEFT: Form ── */}
      <div className="w-full md:w-[60%] overflow-y-auto p-5 space-y-6">
        {/* Header Intro */}
        <div className="flex items-center gap-2 text-primary font-bold text-sm">
          <Truck className="h-4 w-4" />
          <span>Junk Removal & Property Cleanout</span>
        </div>

        {/* 1. Volume Tiers */}
        <section className="space-y-3">
          <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
            1. Estimated Truckload Volume
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-xl">
            {(Object.entries(JUNK_VOLUME_TIERS) as [JunkVolume, typeof JUNK_VOLUME_TIERS[JunkVolume]][]).map(
              ([key, tier]) => {
                const isSelected = volume === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setVolume(key)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-xs'
                        : 'border-border bg-card hover:bg-muted/50'
                    }`}
                  >
                    <p className="text-xs font-bold text-foreground">{tier.label}</p>
                    <p className="text-sm font-extrabold text-primary mt-1">${tier.price}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{tier.desc}</p>
                  </button>
                );
              }
            )}
          </div>
        </section>

        {/* 2. Surcharges & Access */}
        <section className="space-y-4">
          <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
            2. Access & Material Surcharges
          </h3>

          <div className="space-y-3 max-w-md">
            {/* Heavy Materials */}
            <div className="flex items-center justify-between p-3 rounded-xl border bg-card">
              <div>
                <Label className="text-xs font-semibold">Heavy Dense Materials Surcharge</Label>
                <p className="text-[11px] text-muted-foreground">Drywall, tiles, bricks, plaster, concrete (+$110)</p>
              </div>
              <Switch checked={heavyMaterials} onCheckedChange={setHeavyMaterials} />
            </div>

            {/* Flights of Stairs */}
            <div className="flex items-center justify-between p-3 rounded-xl border bg-card">
              <div>
                <Label className="text-xs font-semibold">Stairs Carry (No Elevator)</Label>
                <p className="text-[11px] text-muted-foreground">Manual carry up/down stairs ($35/flight)</p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setStairsCount(Math.max(0, stairsCount - 1))}
                  disabled={stairsCount <= 0}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center text-xs font-semibold">{stairsCount}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setStairsCount(stairsCount + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Appliances with Eco Fees */}
            <div className="flex items-center justify-between p-3 rounded-xl border bg-card">
              <div>
                <Label className="text-xs font-semibold">Appliances with Disposal Fees</Label>
                <p className="text-[11px] text-muted-foreground">Refrigerators, freezers, AC units ($45/unit)</p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setAppliancesCount(Math.max(0, appliancesCount - 1))}
                  disabled={appliancesCount <= 0}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center text-xs font-semibold">{appliancesCount}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setAppliancesCount(appliancesCount + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Disassembly */}
            <div className="flex items-center justify-between p-3 rounded-xl border bg-card">
              <div>
                <Label className="text-xs font-semibold">Furniture Disassembly Required</Label>
                <p className="text-[11px] text-muted-foreground">Beds, modular desks, exercise equipment ($40/item)</p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setDisassemblyItemCount(Math.max(0, disassemblyItemCount - 1))}
                  disabled={disassemblyItemCount <= 0}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center text-xs font-semibold">{disassemblyItemCount}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setDisassemblyItemCount(disassemblyItemCount + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── RIGHT: Summary Card ── */}
      <div className="w-full md:w-[40%] border-t md:border-t-0 md:border-l bg-muted/20 p-5 flex flex-col justify-between">
        <div className="space-y-4">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Junk Haulaway Estimate
            </span>
            <h2 className="text-2xl font-extrabold text-foreground">
              {fmt(result.total)}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Est. ~{result.estimatedLaborMinutes} min on-site labor
            </p>
          </div>

          <div className="space-y-2 border-t pt-3 text-xs">
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Base Volume ({result.volumeLabel})</span>
              <span className="font-semibold">{fmt(result.basePrice)}</span>
            </div>

            {result.addOnBreakdown.map((addon) => (
              <div key={addon.id} className="flex justify-between py-1 text-muted-foreground">
                <span>{addon.label}</span>
                <span className="font-medium text-foreground">{fmt(addon.price)}</span>
              </div>
            ))}

            <div className="border-t pt-2 flex justify-between font-bold text-sm text-foreground">
              <span>Total Price</span>
              <span>{fmt(result.total)}</span>
            </div>
          </div>

          <div className="bg-background/80 p-3 rounded-xl border text-[11px] text-muted-foreground flex items-start gap-2">
            <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
            <p>All junk removal pricing includes loading, sweep-up, transport, and eco-transfer station disposal fees.</p>
          </div>
        </div>

        <div className="pt-4 border-t flex gap-2">
          <Button
            type="button"
            className="w-full"
            onClick={handleCopy}
          >
            <Copy className="h-4 w-4 mr-1.5" />
            Copy Quote
          </Button>
        </div>
      </div>
    </div>
  );
}
