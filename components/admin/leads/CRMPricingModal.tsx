'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Calculator, Copy, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

type PackageType = 'standard_clean' | 'standard_plus_clean' | 'deep_clean' | 'reset_clean';
type PropertySize = 'studio' | '1bed' | '2bed' | '3bed' | '4bed' | '5+bed';

const PACKAGES = {
  standard_clean: { label: 'Standard Clean', base: 250, hours: 2.5 },
  standard_plus_clean: { label: 'Standard Plus', base: 350, hours: 3.5 },
  deep_clean: { label: 'Deep Clean', base: 500, hours: 4.5 },
  reset_clean: { label: 'Reset Clean', base: 750, hours: 7.5 },
};

const SIZE_ADJUSTMENTS: Record<PackageType, Record<PropertySize, number>> = {
  standard_clean: { 'studio': 0, '1bed': 0, '2bed': 30, '3bed': 70, '4bed': 110, '5+bed': 150 },
  standard_plus_clean: { 'studio': 0, '1bed': 0, '2bed': 50, '3bed': 100, '4bed': 170, '5+bed': 220 },
  deep_clean: { 'studio': 0, '1bed': 0, '2bed': 80, '3bed': 180, '4bed': 300, '5+bed': 400 },
  reset_clean: { 'studio': 0, '1bed': 0, '2bed': 150, '3bed': 350, '4bed': 600, '5+bed': 850 },
};

const CONDITION_ADJUSTMENTS = {
  cluttered: { label: 'Home is cluttered/disorganized', hourlyAdd: 15, tooltip: 'Properties with excessive personal items or disorganization may require extra time to work around items.' },
  pets: { label: 'Pets present (fur/odor management)', hourlyAdd: 20, tooltip: 'Pet hair and odor management adds time to vacuum/ventilation cycles.' },
  dirty: { label: 'Extremely dirty (neglect/heavy grime)', hourlyAdd: 25, tooltip: 'Severely neglected properties require extra pre-cleaning prep and slower detailing.' },
};

const ADD_ONS = {
  exterior_windows: { label: 'Exterior window cleaning', price: 130 },
  pressure_washing: { label: 'Pressure washing patio/deck', price: 200 },
  carpet_stain: { label: 'Carpet stain treatment', price: 80 },
  laundry: { label: 'Laundry service', price: 120 },
  closet_org: { label: 'Closet organization', price: 150 },
  kitchen_cabinet_detail: { label: 'Kitchen cabinet interior detail', price: 50 },
};

export function CRMPricingModal({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Lead Details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [address, setAddress] = useState('');

  // Quote Selections
  const [selectedPackage, setSelectedPackage] = useState<PackageType | ''>('');
  const [propertySize, setPropertySize] = useState<PropertySize | ''>('');
  
  const [conditions, setConditions] = useState<Record<string, boolean>>({});
  const [sameDay, setSameDay] = useState(false);
  const [afterHours, setAfterHours] = useState(false);
  const [selectedAddOns, setSelectedAddOns] = useState<Record<string, boolean>>({});

  // Reset form when modal opens/closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setCustomerName(''); setCustomerPhone(''); setCustomerEmail(''); setAddress('');
      setSelectedPackage(''); setPropertySize('');
      setConditions({}); setSameDay(false); setAfterHours(false); setSelectedAddOns({});
    }
    setOpen(newOpen);
  };

  // Warning Checks
  const showPetsDirtyWarning = conditions.pets && conditions.dirty;
  const showResetAddOnsWarning = selectedPackage === 'reset_clean' && Object.values(selectedAddOns).some(v => v);
  const canSelectAddOns = selectedPackage === 'deep_clean' || selectedPackage === 'reset_clean';

  const breakdown = useMemo(() => {
    if (!selectedPackage || !propertySize) return null;

    const pkg = PACKAGES[selectedPackage];
    const basePrice = pkg.base;
    const sizeAdjustment = SIZE_ADJUSTMENTS[selectedPackage][propertySize];

    let conditionAdjustments = 0;
    const activeConditions: { label: string; amount: number; desc: string }[] = [];
    Object.entries(CONDITION_ADJUSTMENTS).forEach(([key, val]) => {
      if (conditions[key]) {
        const amount = val.hourlyAdd * pkg.hours;
        conditionAdjustments += amount;
        activeConditions.push({ label: val.label, amount, desc: `+$${val.hourlyAdd}/hr × ${pkg.hours} hrs` });
      }
    });

    let modifierAdjustments = 0;
    if (sameDay) modifierAdjustments += 100;
    if (afterHours) modifierAdjustments += 50;

    let addOnTotal = 0;
    const activeAddOns: { label: string; amount: number }[] = [];
    if (canSelectAddOns) {
      Object.entries(ADD_ONS).forEach(([key, val]) => {
        if (selectedAddOns[key]) {
          addOnTotal += val.price;
          activeAddOns.push({ label: val.label, amount: val.price });
        }
      });
    }

    let calculatedPrice = basePrice + sizeAdjustment + conditionAdjustments + modifierAdjustments + addOnTotal;
    // Floor minimum
    if (calculatedPrice < 250) calculatedPrice = 250;

    return {
      basePrice,
      sizeAdjustment,
      conditionAdjustments,
      activeConditions,
      modifierAdjustments,
      addOnTotal,
      activeAddOns,
      calculatedPrice,
      estimatedHours: pkg.hours
    };
  }, [selectedPackage, propertySize, conditions, sameDay, afterHours, selectedAddOns, canSelectAddOns]);

  const handleCopy = () => {
    if (!breakdown || !selectedPackage || !propertySize) return;
    
    const text = `
QUOTE BREAKDOWN

Base Package
${PACKAGES[selectedPackage].label} - ${propertySize} Home: $${breakdown.basePrice.toFixed(2)}

Size Adjustment: +$${breakdown.sizeAdjustment.toFixed(2)}

Condition Adjustments: +$${breakdown.conditionAdjustments.toFixed(2)}
${breakdown.activeConditions.map(c => `- ${c.label}: +$${c.amount.toFixed(2)}`).join('\n')}

Service Modifiers: +$${breakdown.modifierAdjustments.toFixed(2)}
${sameDay ? '- Same-day rush: +$100.00\n' : ''}${afterHours ? '- After-hours: +$50.00\n' : ''}
Optional Add-ons: +$${breakdown.addOnTotal.toFixed(2)}
${breakdown.activeAddOns.map(a => `- ${a.label}: +$${a.amount.toFixed(2)}`).join('\n')}
------------------------------------------
SUBTOTAL: $${breakdown.calculatedPrice.toFixed(2)}

Estimated duration: ${breakdown.estimatedHours} hours
`.trim();

    navigator.clipboard.writeText(text);
    toast.success('Quote copied to clipboard');
  };

  const handleGenerateQuote = async () => {
    if (!selectedPackage || !propertySize || !customerName) {
      toast.error('Please fill out required fields (Name, Package, Size)');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/pricing-quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail,
          address: address,
          package_name: selectedPackage,
          property_size: propertySize,
          conditions: Object.keys(conditions).filter(k => conditions[k]),
          modifiers: { sameDay, afterHours },
          add_ons: Object.keys(selectedAddOns).filter(k => selectedAddOns[k]),
          calculated_price: breakdown?.calculatedPrice,
          breakdown: breakdown,
          estimated_hours: breakdown?.estimatedHours,
        })
      });
      
      if (!res.ok) throw new Error('Failed to generate quote');
      
      toast.success('Quote generated and lead created successfully');
      setOpen(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const needsReview = breakdown && breakdown.calculatedPrice > 2000;
  const isExtreme = breakdown && breakdown.calculatedPrice > 5000;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="lg" className="font-bold text-md">
          <Calculator className="h-5 w-5 mr-2" /> New Lead / Quote
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl w-full h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-xl">Generate Pricing Quote</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* LEFT COLUMN: Inputs */}
          <div className="w-full md:w-[60%] p-6 overflow-y-auto space-y-8">
            
            {/* Contact Info */}
            <section className="space-y-4">
              <h3 className="font-semibold text-lg">Contact Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Full Name *</Label><Input value={customerName} onChange={e => setCustomerName(e.target.value)} /></div>
                <div><Label>Phone</Label><Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} /></div>
                <div><Label>Email</Label><Input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} /></div>
                <div><Label>Address/City</Label><Input value={address} onChange={e => setAddress(e.target.value)} /></div>
              </div>
            </section>

            <hr />

            {/* Package Selection */}
            <section className="space-y-4">
              <h3 className="font-semibold text-lg">1. Select Package *</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(PACKAGES).map(([k, v]) => (
                  <div key={k} className={`flex items-start space-x-3 border p-4 rounded-lg cursor-pointer transition-colors ${selectedPackage === k ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`} onClick={() => { setSelectedPackage(k as PackageType); if(k !== 'deep_clean' && k !== 'reset_clean') setSelectedAddOns({}); }}>
                    <input type="radio" name="package_selection" id={k} checked={selectedPackage === k} readOnly className="mt-1.5 h-4 w-4 cursor-pointer" />
                    <div>
                      <Label htmlFor={k} className="font-semibold text-base cursor-pointer">{v.label}</Label>
                      <p className="text-xs text-muted-foreground">Starts at ${v.base}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Property Size */}
            <section className="space-y-4">
              <h3 className="font-semibold text-lg">2. Property Size *</h3>
              <Select value={propertySize} onValueChange={(v) => setPropertySize(v as PropertySize)}>
                <SelectTrigger className="w-full max-w-sm"><SelectValue placeholder="Select size" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="studio">Studio</SelectItem>
                  <SelectItem value="1bed">1 Bedroom</SelectItem>
                  <SelectItem value="2bed">2 Bedrooms</SelectItem>
                  <SelectItem value="3bed">3 Bedrooms</SelectItem>
                  <SelectItem value="4bed">4 Bedrooms</SelectItem>
                  <SelectItem value="5+bed">5+ Bedrooms</SelectItem>
                </SelectContent>
              </Select>
            </section>

            {/* Conditions */}
            <section className="space-y-4">
              <h3 className="font-semibold text-lg">3. Condition Adjustments</h3>
              {showPetsDirtyWarning && (
                <div className="bg-amber-100 text-amber-800 p-3 rounded-md text-sm flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>Both &quot;Pets&quot; and &quot;Extremely dirty&quot; selected. Verify if this is redundant.</p>
                </div>
              )}
              <TooltipProvider>
                <div className="space-y-3">
                  {Object.entries(CONDITION_ADJUSTMENTS).map(([k, v]) => (
                    <div key={k} className="flex items-center space-x-3">
                      <Checkbox id={`cond-${k}`} checked={!!conditions[k]} onCheckedChange={(c) => setConditions(prev => ({ ...prev, [k]: !!c }))} />
                      <Label htmlFor={`cond-${k}`} className="text-sm cursor-pointer">{v.label}</Label>
                      <Tooltip>
                        <TooltipTrigger asChild><Info className="h-4 w-4 text-muted-foreground cursor-help" /></TooltipTrigger>
                        <TooltipContent><p className="w-64">{v.tooltip}</p></TooltipContent>
                      </Tooltip>
                    </div>
                  ))}
                </div>
              </TooltipProvider>
            </section>

            {/* Modifiers */}
            <section className="space-y-4">
              <h3 className="font-semibold text-lg">4. Service Modifiers</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Checkbox id="same-day" checked={sameDay} onCheckedChange={(c) => setSameDay(!!c)} />
                  <Label htmlFor="same-day" className="text-sm cursor-pointer">Same-day rush request (+$100)</Label>
                </div>
                <div className="flex items-center space-x-3">
                  <Checkbox id="after-hours" checked={afterHours} onCheckedChange={(c) => setAfterHours(!!c)} />
                  <Label htmlFor="after-hours" className="text-sm cursor-pointer">After-hours service - evening/weekend (+$50)</Label>
                </div>
              </div>
            </section>

            {/* Add-ons */}
            <section className={`space-y-4 ${!canSelectAddOns ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">5. Optional Add-ons</h3>
                {!canSelectAddOns && <span className="text-xs text-muted-foreground">Available for Deep & Reset Clean only</span>}
              </div>
              {showResetAddOnsWarning && (
                <div className="bg-amber-100 text-amber-800 p-3 rounded-md text-sm flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>Add-ons may already be included in Reset Clean package.</p>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(ADD_ONS).map(([k, v]) => (
                  <div key={k} className="flex items-center space-x-3">
                    <Checkbox id={`addon-${k}`} checked={!!selectedAddOns[k]} onCheckedChange={(c) => setSelectedAddOns(prev => ({ ...prev, [k]: !!c }))} disabled={!canSelectAddOns} />
                    <Label htmlFor={`addon-${k}`} className="text-sm cursor-pointer">{v.label} (+${v.price})</Label>
                  </div>
                ))}
              </div>
            </section>

          </div>

          {/* RIGHT COLUMN: Sticky Quote Card */}
          <div className="w-full md:w-[40%] bg-muted/30 border-l p-6 flex flex-col">
            <div className="bg-card border rounded-xl shadow-sm p-6 flex-1 flex flex-col max-h-full overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-bold text-xl tracking-tight">Quote Breakdown</h2>
                <Button variant="ghost" size="icon" onClick={handleCopy} disabled={!breakdown}><Copy className="h-4 w-4" /></Button>
              </div>

              {!breakdown ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm text-center">
                  Select a package and property size to see the real-time quote.
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                  
                  {/* Base Package */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Base Package</h4>
                    <div className="flex justify-between text-sm">
                      <span>{PACKAGES[selectedPackage as PackageType].label} - {propertySize}</span>
                      <span className="font-medium">${breakdown.basePrice.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Size Adjustment */}
                  {breakdown.sizeAdjustment > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Size Adjustment</h4>
                      <div className="flex justify-between text-sm text-orange-600">
                        <span>{propertySize} premium</span>
                        <span>+${breakdown.sizeAdjustment.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {/* Condition Adjustments */}
                  {breakdown.conditionAdjustments > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Condition Adjustments</h4>
                      {breakdown.activeConditions.map((c, i) => (
                        <div key={i} className="flex justify-between text-sm text-orange-600 mb-1">
                          <span>{c.label.split('(')[0]} <span className="text-xs opacity-70">({c.desc})</span></span>
                          <span>+${c.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Modifiers */}
                  {breakdown.modifierAdjustments > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Service Modifiers</h4>
                      {sameDay && <div className="flex justify-between text-sm text-orange-600 mb-1"><span>Same-day rush</span><span>+$100.00</span></div>}
                      {afterHours && <div className="flex justify-between text-sm text-orange-600"><span>After-hours service</span><span>+$50.00</span></div>}
                    </div>
                  )}

                  {/* Add Ons */}
                  {breakdown.addOnTotal > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Optional Add-ons</h4>
                      {breakdown.activeAddOns.map((a, i) => (
                        <div key={i} className="flex justify-between text-sm text-orange-600 mb-1">
                          <span>{a.label}</span>
                          <span>+${a.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <hr />
                  
                  {/* Totals */}
                  <div>
                    <div className="flex justify-between items-center text-2xl font-bold text-primary mb-4">
                      <span>SUBTOTAL</span>
                      <span>${breakdown.calculatedPrice.toFixed(2)}</span>
                    </div>
                    
                    {needsReview && (
                      <div className={`p-3 rounded-md text-sm mb-4 ${isExtreme ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                        <AlertTriangle className="h-4 w-4 inline mr-2 -mt-0.5" />
                        {isExtreme ? 'Quote exceeds $5000. Manual review strictly required.' : 'Quote exceeds $2000. Flag for manual review.'}
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>• Estimated duration: {breakdown.estimatedHours} hours</p>
                      <p>• Service type: {PACKAGES[selectedPackage as PackageType].label}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 pt-4 border-t">
                <Button 
                  className="w-full text-base font-bold" 
                  size="lg" 
                  onClick={handleGenerateQuote}
                  disabled={!selectedPackage || !propertySize || !customerName || loading || isExtreme}
                >
                  {loading ? 'Generating...' : 'Generate Quote'}
                </Button>
                {isExtreme && <p className="text-xs text-center text-red-600 mt-2">Cannot auto-generate quote &gt; $5000</p>}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
