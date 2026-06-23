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
import { Checkbox } from '@/components/ui/checkbox';
import { Calculator, Copy, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

type PackageType = 'standard_clean' | 'standard_plus_clean' | 'deep_clean' | 'reset_clean';

const PACKAGES = {
  standard_clean: { label: 'Standard Clean', base: 200, hours: 2.5 },
  standard_plus_clean: { label: 'Standard Plus', base: 300, hours: 3.5 },
  deep_clean: { label: 'Deep Clean', base: 500, hours: 4.5 },
  reset_clean: { label: 'Reset Clean', base: 750, hours: 7.5 },
};

const CHECKLIST_TASKS: Record<string, { label: string; price: number }> = {
  oven: { label: 'Inside Oven', price: 35 },
  fridge: { label: 'Inside Fridge', price: 35 },
  windows_in: { label: 'Interior Windows', price: 50 },
  baseboards: { label: 'Baseboards Detail', price: 45 },
  pet_odor: { label: 'Heavy Pet Hair / Odor', price: 50 },
  cluttered: { label: 'Cluttered / Disorganized Prep', price: 40 },
  cabinets: { label: 'Move-in / Move-out Cabinet Detail', price: 80 },
};

export function CRMPricingModal({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Lead Details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [address, setAddress] = useState('');

  // Selections
  const [selectedPackage, setSelectedPackage] = useState<PackageType>('standard_clean');

  // Detailed Size Inputs
  const [bedrooms, setBedrooms] = useState<number>(1);
  const [bathrooms, setBathrooms] = useState<number>(1);
  const [sqft, setSqft] = useState<number>(1000);
  
  // Checklist State
  const [selectedTasks, setSelectedTasks] = useState<Record<string, boolean>>({});
  
  // Modifiers
  const [sameDay, setSameDay] = useState(false);
  const [afterHours, setAfterHours] = useState(false);

  // Manual Override
  const [manualPrice, setManualPrice] = useState<number | null>(null);

  // Reset form when modal opens/closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setCustomerName(''); setCustomerPhone(''); setCustomerEmail(''); setAddress('');
      setSelectedPackage('standard_clean');
      setBedrooms(1); setBathrooms(1); setSqft(1000);
      setSelectedTasks({}); setSameDay(false); setAfterHours(false);
      setManualPrice(null);
    }
    setOpen(newOpen);
  };

  const breakdown = useMemo(() => {
    if (!selectedPackage) return null;

    const pkg = PACKAGES[selectedPackage];
    const basePrice = pkg.base;

    // Size logic
    // Extra beds over 1
    const extraBeds = Math.max(0, bedrooms - 1);
    const bedroomAdjustment = extraBeds * 20;

    // Extra baths over 1
    const extraBaths = Math.max(0, bathrooms - 1);
    const bathroomAdjustment = extraBaths * 15;

    // Extra sqft (12c per sqft over 1000)
    const extraSqft = Math.max(0, sqft - 1000);
    const sqftAdjustment = extraSqft * 0.12;

    // Tasks logic
    let tasksTotal = 0;
    const activeTasks: { id: string; label: string; amount: number }[] = [];
    Object.entries(CHECKLIST_TASKS).forEach(([key, val]) => {
      if (selectedTasks[key]) {
        tasksTotal += val.price;
        activeTasks.push({ id: key, label: val.label, amount: val.price });
      }
    });

    let modifierAdjustments = 0;
    if (sameDay) modifierAdjustments += 100;
    if (afterHours) modifierAdjustments += 50;

    const calculatedPrice = basePrice + bedroomAdjustment + bathroomAdjustment + sqftAdjustment + tasksTotal + modifierAdjustments;
    
    return {
      basePrice,
      bedroomAdjustment,
      bathroomAdjustment,
      sqftAdjustment,
      tasksTotal,
      activeTasks,
      modifierAdjustments,
      calculatedPrice,
      estimatedHours: pkg.hours
    };
  }, [selectedPackage, bedrooms, bathrooms, sqft, selectedTasks, sameDay, afterHours]);

  // Clear manual price if they change the calculator inputs
  useMemo(() => {
    setManualPrice(null);
  }, [breakdown?.calculatedPrice]);

  const finalPrice = manualPrice !== null ? manualPrice : (breakdown?.calculatedPrice || 0);

  const handleCopy = () => {
    if (!breakdown || !selectedPackage) return;
    
    const text = `
QUOTE BREAKDOWN

Base Package
${PACKAGES[selectedPackage].label} (Up to 1 Bed/1 Bath/1000 Sqft): $${breakdown.basePrice.toFixed(2)}

Property Sizing Adjustments:
${breakdown.bedroomAdjustment > 0 ? `- Extra Bedrooms (${Math.max(0, bedrooms - 1)}): +$${breakdown.bedroomAdjustment.toFixed(2)}\n` : ''}${breakdown.bathroomAdjustment > 0 ? `- Extra Bathrooms (${Math.max(0, bathrooms - 1)}): +$${breakdown.bathroomAdjustment.toFixed(2)}\n` : ''}${breakdown.sqftAdjustment > 0 ? `- Extra Sqft: +$${breakdown.sqftAdjustment.toFixed(2)}\n` : ''}
Selected Extras:
${breakdown.activeTasks.length > 0 ? breakdown.activeTasks.map(t => `- ${t.label}: +$${t.amount.toFixed(2)}`).join('\n') : 'No extras selected.'}

Service Modifiers:
${sameDay ? '- Same-day rush: +$100.00\n' : ''}${afterHours ? '- After-hours: +$50.00\n' : ''}
------------------------------------------
${manualPrice !== null ? `ORIGINAL CALCULATED: $${breakdown.calculatedPrice.toFixed(2)}\nCUSTOM DISCOUNT/OVERRIDE APPLIED\n------------------------------------------\n` : ''}SUBTOTAL: $${finalPrice.toFixed(2)}

Estimated duration: ~${breakdown.estimatedHours} hours
`.trim();

    navigator.clipboard.writeText(text);
    toast.success('Quote copied to clipboard');
  };

  const handleGenerateQuote = async () => {
    if (!customerName || !selectedPackage) {
      toast.error('Please fill out the required fields (Name, Package).');
      return;
    }
    
    setLoading(true);
    try {
      const activeTaskIds = Object.keys(selectedTasks).filter(k => selectedTasks[k]);

      const res = await fetch('/api/pricing-quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail,
          address: address,
          package_name: selectedPackage,
          selected_tasks: activeTaskIds,
          bedrooms,
          bathrooms,
          sqft,
          conditions: [], // deprecated from UI but kept in schema array
          modifiers: { sameDay, afterHours },
          add_ons: [], // deprecated
          calculated_price: finalPrice,
          breakdown: breakdown,
          estimated_hours: breakdown?.estimatedHours,
        })
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate quote');
      }
      
      toast.success('Quote generated and lead created successfully');
      setOpen(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const needsReview = breakdown ? breakdown.calculatedPrice > 2000 : false;
  const isExtreme = breakdown ? breakdown.calculatedPrice > 5000 : false;

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
                <div><Label>Full Name *</Label><Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="John Doe" /></div>
                <div><Label>Phone</Label><Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="(555) 555-5555" /></div>
                <div><Label>Email</Label><Input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="john@example.com" /></div>
                <div><Label>Address/City</Label><Input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St" /></div>
              </div>
            </section>

            <hr />

            {/* Package Selection */}
            <section className="space-y-4">
              <h3 className="font-semibold text-lg">1. Select Package *</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(PACKAGES).map(([k, v]) => (
                  <div key={k} className={`flex items-start space-x-3 border p-4 rounded-lg cursor-pointer transition-colors ${selectedPackage === k ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`} onClick={() => setSelectedPackage(k as PackageType)}>
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
              <h3 className="font-semibold text-lg">2. Property Details *</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Bedrooms</Label>
                  <Input type="number" min={1} value={bedrooms} onChange={e => setBedrooms(parseInt(e.target.value) || 1)} />
                </div>
                <div>
                  <Label>Bathrooms</Label>
                  <Input type="number" min={1} value={bathrooms} onChange={e => setBathrooms(parseInt(e.target.value) || 1)} />
                </div>
                <div>
                  <Label>Square Footage</Label>
                  <Input type="number" min={0} step={100} value={sqft} onChange={e => setSqft(parseInt(e.target.value) || 0)} />
                </div>
              </div>
            </section>

            {/* Checklist */}
            <section className="space-y-4">
              <h3 className="font-semibold text-lg">3. Service Extras (Add-ons)</h3>
              <p className="text-sm text-muted-foreground mb-4">Check off any optional extras the customer wants.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(CHECKLIST_TASKS).map(([k, v]) => (
                  <div key={k} className={`flex items-start space-x-3 border p-4 rounded-lg cursor-pointer transition-colors ${selectedTasks[k] ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`} onClick={() => setSelectedTasks(prev => ({ ...prev, [k]: !prev[k] }))}>
                    <Checkbox id={`task-${k}`} checked={!!selectedTasks[k]} onCheckedChange={(c) => setSelectedTasks(prev => ({ ...prev, [k]: !!c }))} className="mt-1" />
                    <div>
                      <Label htmlFor={`task-${k}`} className="font-medium text-sm cursor-pointer">{v.label}</Label>
                      <p className="text-xs font-semibold text-primary/80">+${v.price}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Modifiers */}
            <section className="space-y-4">
              <h3 className="font-semibold text-lg">4. Modifiers</h3>
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
                  Select a package to see the quote.
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                  
                  {/* Base Package */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Base Package</h4>
                    <div className="flex justify-between text-sm">
                      <span>{PACKAGES[selectedPackage].label}</span>
                      <span className="font-medium">${breakdown.basePrice.toFixed(2)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Covers up to 1 Bed / 1 Bath / 1000 Sqft</p>
                  </div>

                  {/* Size Adjustment */}
                  {(breakdown.bedroomAdjustment > 0 || breakdown.bathroomAdjustment > 0 || breakdown.sqftAdjustment > 0) && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Size Premium</h4>
                      {breakdown.bedroomAdjustment > 0 && (
                        <div className="flex justify-between text-sm text-slate-700 mb-1">
                          <span>Extra Bedrooms ({Math.max(0, bedrooms - 1)})</span>
                          <span>+${breakdown.bedroomAdjustment.toFixed(2)}</span>
                        </div>
                      )}
                      {breakdown.bathroomAdjustment > 0 && (
                        <div className="flex justify-between text-sm text-slate-700 mb-1">
                          <span>Extra Bathrooms ({Math.max(0, bathrooms - 1)})</span>
                          <span>+${breakdown.bathroomAdjustment.toFixed(2)}</span>
                        </div>
                      )}
                      {breakdown.sqftAdjustment > 0 && (
                        <div className="flex justify-between text-sm text-slate-700 mb-1">
                          <span>Extra Sqft ({sqft > 1000 ? sqft - 1000 : 0})</span>
                          <span>+${breakdown.sqftAdjustment.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Checklist Tasks */}
                  {breakdown.activeTasks.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Service Extras</h4>
                      {breakdown.activeTasks.map((t, i) => (
                        <div key={i} className="flex justify-between text-sm text-blue-700 font-medium mb-1">
                          <span>{t.label}</span>
                          <span>+${t.amount.toFixed(2)}</span>
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

                  <hr />
                  
                  {/* Totals */}
                  <div>
                    <div className="flex justify-between items-center text-3xl font-bold text-primary mb-4">
                      <span>TOTAL</span>
                      <div className="flex items-center">
                        <span className="mr-1">$</span>
                        <Input 
                          type="number" 
                          className="w-32 text-2xl font-bold h-12 text-right focus-visible:ring-1"
                          value={manualPrice !== null ? manualPrice : breakdown.calculatedPrice}
                          onChange={(e) => setManualPrice(e.target.value === '' ? null : (parseFloat(e.target.value) || 0))}
                        />
                      </div>
                    </div>
                    
                    {needsReview && (
                      <div className={`p-3 rounded-md text-sm mb-4 ${isExtreme ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                        <AlertTriangle className="h-4 w-4 inline mr-2 -mt-0.5" />
                        {isExtreme ? 'Quote exceeds $5000. Manual review strictly required.' : 'Quote exceeds $2000. Flag for manual review.'}
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>• Estimated duration: ~{breakdown.estimatedHours} hours</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 pt-4 border-t">
                <Button 
                  className="w-full text-base font-bold" 
                  size="lg" 
                  onClick={handleGenerateQuote}
                  disabled={!customerName || !selectedPackage || loading || isExtreme}
                >
                  {loading ? 'Generating...' : 'Generate Quote & Lead'}
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
