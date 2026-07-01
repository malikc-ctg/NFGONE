'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';
import {
  Calculator,
  Copy,
  AlertTriangle,
  Minus,
  Plus,
  ClipboardCheck,
  FileText,
  Info,
  ChevronDown,
  ChevronUp,
  Users,
  Home,
  Building2,
  Warehouse,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  type PropertyType,
  type PackageType,
  type Frequency,
  CONDO_RATES,
  BASEMENT_RATES,
  HOUSE_RATES,
  ADD_ONS,
  ADD_ON_CATEGORIES,
  PACKAGE_LABELS,
  PROPERTY_TYPE_LABELS,
  FREQUENCY_LABELS,
  PACKAGE_TIER_ORDER,
  PACKAGE_TO_SERVICE_TYPE,
} from '@/lib/pricing/constants';
import { calculateQuote, type QuoteInput, type QuoteResult } from '@/lib/pricing/calculator';
import { generateScopeOfWork } from '@/lib/pricing/scope-of-work';

// ============================================================
// Sub-components
// ============================================================

// --- Stepper ---
function Stepper({
  value,
  onChange,
  min = 0,
  max = 20,
  step = 1,
  label,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      {label && <Label className="text-xs text-muted-foreground">{label}</Label>}
      <div className="flex items-center gap-0">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-r-none border-r-0 shrink-0"
          onClick={() => onChange(Math.max(min, value - step))}
          disabled={value <= min}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <div className="h-8 min-w-[3rem] flex items-center justify-center border border-input bg-background text-sm font-medium px-2">
          {value}{suffix}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-l-none border-l-0 shrink-0"
          onClick={() => onChange(Math.min(max, value + step))}
          disabled={value >= max}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// --- Property Type Card ---
function PropertyTypeCard({
  type,
  icon: Icon,
  selected,
  onClick,
}: {
  type: PropertyType;
  icon: React.ElementType;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all cursor-pointer text-center ${
        selected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-muted hover:border-primary/30 hover:bg-muted/50'
      }`}
      onClick={onClick}
    >
      <Icon className={`h-5 w-5 ${selected ? 'text-primary' : 'text-muted-foreground'}`} />
      <span className={`text-xs font-medium ${selected ? 'text-primary' : 'text-muted-foreground'}`}>
        {PROPERTY_TYPE_LABELS[type]}
      </span>
    </button>
  );
}

// --- Package Card ---
function PackageCard({
  pkg,
  selected,
  priceHint,
  onClick,
}: {
  pkg: PackageType;
  selected: boolean;
  priceHint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer text-left ${
        selected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-muted hover:border-primary/30 hover:bg-muted/50'
      }`}
      onClick={onClick}
    >
      <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
        selected ? 'border-primary' : 'border-muted-foreground/40'
      }`}>
        {selected && <div className="h-2 w-2 rounded-full bg-primary" />}
      </div>
      <div className="min-w-0">
        <div className={`text-sm font-semibold ${selected ? 'text-primary' : ''}`}>
          {PACKAGE_LABELS[pkg]}
        </div>
        <div className="text-[10px] text-muted-foreground">{priceHint}</div>
      </div>
    </button>
  );
}

// ============================================================
// Main Modal
// ============================================================

export function CRMPricingModal({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog modal={false} open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="font-bold text-md">
          <Calculator className="h-5 w-5 mr-2" /> New Lead / Quote
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-6xl w-full h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 py-3 border-b shrink-0">
          <DialogTitle className="text-lg">Generate Pricing Quote</DialogTitle>
          <DialogDescription className="sr-only">
            Generate a new pricing quote using the Sea of Blue rate card.
          </DialogDescription>
        </DialogHeader>
        {open && <PricingModalContent onSuccess={onSuccess} onClose={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Modal Content — all state lives here, destroyed on close
// ============================================================

function PricingModalContent({
  onSuccess,
  onClose,
}: {
  onSuccess?: () => void;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [quoteFinalized, setQuoteFinalized] = useState(false);
  const [scopeText, setScopeText] = useState('');

  // --- Contact ---
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [address, setAddress] = useState('');
  const [source, setSource] = useState('inbound_call');

  // --- Property ---
  const [propertyType, setPropertyType] = useState<PropertyType>('condo');
  const [sqft, setSqft] = useState(500);
  const [fullBathrooms, setFullBathrooms] = useState(1);
  const [halfBathrooms, setHalfBathrooms] = useState(0);

  // --- Package ---
  const [selectedPackage, setSelectedPackage] = useState<PackageType>('standard');
  const [frequency, setFrequency] = useState<Frequency>('one_time');
  const [vacancyConfirmed, setVacancyConfirmed] = useState(false);

  // --- Add-ons ---
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [customAddOnPrices, setCustomAddOnPrices] = useState<Record<string, number>>({});
  const [addOnQuantities, setAddOnQuantities] = useState<Record<string, number>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // --- Manual override ---
  const [manualPrice, setManualPrice] = useState<number | null>(null);

  // Disable frequency for non-standard packages
  const frequencyEnabled = selectedPackage === 'standard' || selectedPackage === 'standard_plus';

  // Reset frequency when switching to a non-standard package
  const handlePackageChange = (pkg: PackageType) => {
    setSelectedPackage(pkg);
    if (pkg !== 'standard' && pkg !== 'standard_plus') {
      setFrequency('one_time');
    }
    setManualPrice(null);
    setQuoteFinalized(false);
  };

  // Toggle add-on
  const toggleAddOn = (id: string) => {
    setSelectedAddOnIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setManualPrice(null);
    setQuoteFinalized(false);
  };

  // Toggle category expand
  const toggleCategory = (label: string) => {
    setExpandedCategories((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  // Get price hint for a package based on property type
  const getPackagePriceHint = (pkg: PackageType): string => {
    const table =
      propertyType === 'condo' ? CONDO_RATES :
      propertyType === 'basement' ? BASEMENT_RATES :
      HOUSE_RATES;
    if (table.length === 0) return '';
    const first = table[0];
    const key = pkg === 'standard' ? 'standard' :
                pkg === 'standard_plus' ? 'standardPlus' :
                pkg === 'deep_clean' ? 'deepClean' :
                pkg === 'full_reset' ? 'fullReset' : 'moveInOut';
    const val = first[key as keyof typeof first];
    if (Array.isArray(val)) return `From $${val[0]}`;
    return `From $${val}`;
  };

  // --- Calculate quote ---
  const quoteInput: QuoteInput = useMemo(() => ({
    propertyType,
    sqft,
    selectedPackage,
    frequency: frequencyEnabled ? frequency : 'one_time',
    fullBathrooms,
    halfBathrooms,
    selectedAddOnIds,
    customAddOnPrices,
    addOnQuantities,
    vacancyConfirmed,
  }), [propertyType, sqft, selectedPackage, frequency, frequencyEnabled, fullBathrooms, halfBathrooms, selectedAddOnIds, customAddOnPrices, addOnQuantities, vacancyConfirmed]);

  const quote: QuoteResult = useMemo(() => calculateQuote(quoteInput), [quoteInput]);

  // Final price (with manual override)
  const finalPrice = useMemo(() => {
    if (manualPrice !== null) return manualPrice;
    if (quote.isRange) return quote.total as [number, number];
    return quote.total as number;
  }, [manualPrice, quote]);

  const displayTotal = typeof finalPrice === 'number'
    ? `$${finalPrice.toFixed(2)}`
    : `$${(finalPrice as [number, number])[0].toFixed(2)}–$${(finalPrice as [number, number])[1].toFixed(2)}`;

  // --- Handlers ---

  const handleCopyBreakdown = () => {
    const lines: string[] = [`QUOTE BREAKDOWN`, ''];
    lines.push(`Property: ${PROPERTY_TYPE_LABELS[propertyType]}, ${quote.sizeBandLabel}`);
    lines.push(`Package: ${PACKAGE_LABELS[selectedPackage]}`);

    if (quote.isRange) {
      const [min, max] = quote.basePrice as [number, number];
      lines.push(`Base: $${min.toFixed(2)}–$${max.toFixed(2)} (confirmed on arrival)`);
    } else {
      lines.push(`Base: $${(quote.basePrice as number).toFixed(2)}`);
    }

    if (quote.bathroomAdjustment > 0) {
      lines.push(`Bathroom adjustment: +$${quote.bathroomAdjustment.toFixed(2)}`);
    }
    if (typeof quote.frequencyDiscount === 'number' && quote.frequencyDiscount < 0) {
      lines.push(`${FREQUENCY_LABELS[frequency]} discount (${(quote.frequencyDiscountPercent * 100).toFixed(0)}%): $${quote.frequencyDiscount.toFixed(2)}`);
    }

    const pricedAddOns = quote.addOns.filter((a) => typeof a.price === 'number');
    if (pricedAddOns.length > 0) {
      lines.push('', 'Add-ons:');
      for (const a of pricedAddOns) {
        const q = a.quantity > 1 ? ` (×${a.quantity})` : '';
        lines.push(`  - ${a.label}${q}: +$${(a.price as number).toFixed(2)}`);
      }
    }
    for (const s of quote.percentageSurcharges) {
      lines.push(`  - ${s.label} (${(s.percent * 100).toFixed(1)}%): +$${s.amount.toFixed(2)}`);
    }

    lines.push('', '—'.repeat(40));
    if (manualPrice !== null) {
      lines.push(`CALCULATED: ${typeof quote.total === 'number' ? '$' + quote.total.toFixed(2) : '$' + (quote.total as [number, number])[0].toFixed(2) + '–$' + (quote.total as [number, number])[1].toFixed(2)}`);
      lines.push(`OVERRIDE APPLIED`);
      lines.push(`TOTAL: $${manualPrice.toFixed(2)}`);
    } else {
      lines.push(`TOTAL: ${displayTotal}`);
    }

    navigator.clipboard.writeText(lines.join('\n'));
    toast.success('Quote copied to clipboard');
  };

  const handleCopyScopeOfWork = () => {
    const text = generateScopeOfWork({
      customerName,
      propertyType,
      sizeBandLabel: quote.sizeBandLabel,
      selectedPackage,
      frequency: frequencyEnabled ? frequency : 'one_time',
      quote,
      vacancyConfirmed,
    });
    setScopeText(text);
    navigator.clipboard.writeText(text);
    toast.success('Scope of work copied to clipboard');
  };

  const handleGenerateQuote = async () => {
    if (!customerName) {
      toast.error('Please enter the customer name.');
      return;
    }
    if (quote.requiresCustomQuote && quote.total === 0 && manualPrice === null) {
      toast.error('This quote requires a manual price entry.');
      return;
    }
    if (selectedPackage === 'move_in_out' && !vacancyConfirmed) {
      toast.error('Move-In/Out requires vacancy confirmation.');
      return;
    }
    if (quote.unresolvedCustomAddOns.length > 0) {
      toast.error('Some add-ons require a custom price. Please enter them or remove them.');
      return;
    }

    setLoading(true);
    try {
      const computedTotal = typeof finalPrice === 'number' ? finalPrice : (finalPrice as [number, number])[1];
      const sowText = generateScopeOfWork({
        customerName,
        propertyType,
        sizeBandLabel: quote.sizeBandLabel,
        selectedPackage,
        frequency: frequencyEnabled ? frequency : 'one_time',
        quote,
        vacancyConfirmed,
      });

      const res = await fetch('/api/pricing-quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail,
          address,
          source,
          property_type: propertyType,
          package_name: PACKAGE_TO_SERVICE_TYPE[selectedPackage],
          frequency: frequencyEnabled ? frequency : 'one_time',
          selected_add_ons: selectedAddOnIds,
          add_on_quantities: addOnQuantities,
          custom_add_on_prices: customAddOnPrices,
          bedrooms: 0, // not used for pricing anymore, kept for schema compat
          bathrooms: fullBathrooms,
          half_bathrooms: halfBathrooms,
          sqft,
          calculated_price: computedTotal,
          price_min: quote.isRange ? (quote.total as [number, number])[0] : null,
          price_max: quote.isRange ? (quote.total as [number, number])[1] : null,
          is_range: quote.isRange,
          is_custom_quote: quote.requiresCustomQuote,
          vacancy_confirmed: vacancyConfirmed,
          breakdown: quote,
          scope_of_work_text: sowText,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate quote');
      }

      toast.success('Quote generated and lead created');
      setQuoteFinalized(true);
      setScopeText(sowText);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Determine house band hint
  const currentHouseBand = propertyType === 'house'
    ? HOUSE_RATES.find((b) => sqft >= b.sqftMin && (b.sqftMax === null || sqft < b.sqftMax))
    : null;

  return (
    <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
      {/* LEFT COLUMN: Form Inputs */}
      <div className="w-full md:w-[60%] overflow-y-auto">
        <div className="p-5 space-y-5">

          {/* ── Contact Info ── */}
          <section className="space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Contact</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Full Name *</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="John Doe"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="(555) 555-5555"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Address / City</Label>
                <AddressAutocomplete
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onAddressSelect={(addr) => setAddress(`${addr.address_line1}, ${addr.city}`)}
                />
              </div>
              <div>
                <Label className="text-xs">Lead Source *</Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inbound_call">Inbound Call</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="realtor">Realtor</SelectItem>
                    <SelectItem value="lsa">Local Service Ads (LSA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <hr className="border-muted" />

          {/* ── Property Type ── */}
          <section className="space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
              1. Property Type
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <PropertyTypeCard type="condo" icon={Building2} selected={propertyType === 'condo'} onClick={() => { setPropertyType('condo'); setManualPrice(null); setQuoteFinalized(false); }} />
              <PropertyTypeCard type="basement" icon={Warehouse} selected={propertyType === 'basement'} onClick={() => { setPropertyType('basement'); setManualPrice(null); setQuoteFinalized(false); }} />
              <PropertyTypeCard type="house" icon={Home} selected={propertyType === 'house'} onClick={() => { setPropertyType('house'); setManualPrice(null); setQuoteFinalized(false); }} />
            </div>
          </section>

          {/* ── Size & Bathrooms ── */}
          <section className="space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
              2. Size & Bathrooms
            </h3>
            <div className="flex items-end gap-4 flex-wrap">
              <Stepper label="Sqft" value={sqft} onChange={(v) => { setSqft(v); setManualPrice(null); setQuoteFinalized(false); }} min={0} max={5000} step={100} />
              <Stepper label="Full Baths" value={fullBathrooms} onChange={(v) => { setFullBathrooms(v); setManualPrice(null); setQuoteFinalized(false); }} min={0} max={10} />
              <Stepper label="Half Baths" value={halfBathrooms} onChange={(v) => { setHalfBathrooms(v); setManualPrice(null); setQuoteFinalized(false); }} min={0} max={10} />
            </div>
            {/* House band hint */}
            {propertyType === 'house' && currentHouseBand?.bedBath && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                Typical config for {currentHouseBand.label}: {currentHouseBand.bedBath}
              </p>
            )}
            {propertyType === 'house' && sqft >= 3000 && (
              <div className="p-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                3,000+ sqft house — custom quote required, site visit recommended.
              </div>
            )}
          </section>

          <hr className="border-muted" />

          {/* ── Package ── */}
          <section className="space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
              3. Package
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PACKAGE_TIER_ORDER.map((pkg) => (
                <PackageCard
                  key={pkg}
                  pkg={pkg}
                  selected={selectedPackage === pkg}
                  priceHint={getPackagePriceHint(pkg)}
                  onClick={() => handlePackageChange(pkg)}
                />
              ))}
            </div>

            {/* Vacancy toggle for Move-In/Out */}
            {selectedPackage === 'move_in_out' && (
              <div className="p-3 rounded-md border border-blue-200 bg-blue-50 space-y-2">
                <div className="flex items-center gap-3">
                  <Switch
                    id="vacancy"
                    checked={vacancyConfirmed}
                    onCheckedChange={setVacancyConfirmed}
                  />
                  <Label htmlFor="vacancy" className="text-sm font-medium cursor-pointer">
                    Unit is fully vacant
                  </Label>
                </div>
                {!vacancyConfirmed && (
                  <p className="text-xs text-amber-700 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Move-In/Out requires a vacant unit. Switch to Full Reset for occupied properties.
                  </p>
                )}
              </div>
            )}
          </section>

          {/* ── Frequency ── */}
          <section className="space-y-2">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
              4. Frequency
            </h3>
            {frequencyEnabled ? (
              <div className="flex gap-2 flex-wrap">
                {(Object.keys(FREQUENCY_LABELS) as Frequency[]).map((f) => (
                  <Button
                    key={f}
                    type="button"
                    variant={frequency === f ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => { setFrequency(f); setManualPrice(null); setQuoteFinalized(false); }}
                  >
                    {FREQUENCY_LABELS[f]}
                    {f !== 'one_time' && (
                      <span className="ml-1 opacity-70">
                        ({Math.abs(FREQUENCY_DISCOUNT_MAP[f] * 100)}% off)
                      </span>
                    )}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">One-time service (frequency discounts only apply to Standard / Standard Plus)</p>
            )}
          </section>

          <hr className="border-muted" />

          {/* ── Add-Ons ── */}
          <section className="space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
              5. Add-Ons
            </h3>

            {ADD_ON_CATEGORIES.map((cat) => {
              const isExpanded = expandedCategories[cat.label] !== false; // default open
              const addOnsInCat = cat.ids.map((id) => ADD_ONS.find((a) => a.id === id)!).filter(Boolean);
              const selectedCount = addOnsInCat.filter((a) => selectedAddOnIds.includes(a.id)).length;
              const includedCount = addOnsInCat.filter((a) => {
                if (!a.includedFrom) return false;
                return PACKAGE_TIER_ORDER.indexOf(selectedPackage) >= PACKAGE_TIER_ORDER.indexOf(a.includedFrom);
              }).length;

              return (
                <div key={cat.label} className="border rounded-lg overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors"
                    onClick={() => toggleCategory(cat.label)}
                  >
                    <span className="text-xs font-semibold">{cat.label}</span>
                    <div className="flex items-center gap-2">
                      {selectedCount > 0 && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                          {selectedCount} selected
                        </Badge>
                      )}
                      {includedCount > 0 && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-green-700 border-green-300">
                          {includedCount} included
                        </Badge>
                      )}
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-2 space-y-1">
                      {addOnsInCat.map((addOn) => {
                        const isIncluded = addOn.includedFrom
                          ? PACKAGE_TIER_ORDER.indexOf(selectedPackage) >= PACKAGE_TIER_ORDER.indexOf(addOn.includedFrom)
                          : false;
                        const isSelected = selectedAddOnIds.includes(addOn.id);
                        const isCustom = addOn.customQuoteOnly;
                        const hasPercent = !!addOn.percentOfTotal;
                        const quantity = addOnQuantities[addOn.id] || 1;

                        return (
                          <div
                            key={addOn.id}
                            className={`flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${
                              isIncluded
                                ? 'bg-green-50 opacity-80'
                                : isSelected
                                ? 'bg-primary/5'
                                : 'hover:bg-muted/50'
                            }`}
                          >
                            {isIncluded ? (
                              <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
                            ) : (
                              <Checkbox
                                id={`addon-${addOn.id}`}
                                checked={isSelected}
                                onCheckedChange={() => toggleAddOn(addOn.id)}
                                className="h-3.5 w-3.5"
                              />
                            )}
                            <label
                              htmlFor={`addon-${addOn.id}`}
                              className={`flex-1 text-xs cursor-pointer ${isIncluded ? 'text-green-700' : ''}`}
                            >
                              {addOn.label}
                            </label>

                            {isIncluded && (
                              <span className="text-[10px] text-green-600 font-medium">Included</span>
                            )}

                            {!isIncluded && isCustom && isSelected && (
                              <Input
                                type="number"
                                className="h-6 w-20 text-xs text-right"
                                placeholder="$ price"
                                value={customAddOnPrices[addOn.id] || ''}
                                onChange={(e) => {
                                  setCustomAddOnPrices((prev) => ({
                                    ...prev,
                                    [addOn.id]: parseFloat(e.target.value) || 0,
                                  }));
                                  setManualPrice(null);
                                  setQuoteFinalized(false);
                                }}
                              />
                            )}

                            {!isIncluded && !isCustom && !hasPercent && addOn.price !== null && (
                              <span className="text-[10px] text-muted-foreground font-medium">
                                ${addOn.price}{addOn.perUnit ? `/${addOn.perUnit}` : ''}
                              </span>
                            )}

                            {!isIncluded && hasPercent && (
                              <span className="text-[10px] text-muted-foreground font-medium">
                                {(addOn.percentOfTotal! * 100).toFixed(1)}% of total
                              </span>
                            )}

                            {!isIncluded && isCustom && !isSelected && (
                              <span className="text-[10px] text-muted-foreground">Custom</span>
                            )}

                            {/* Quantity stepper for per-unit items */}
                            {!isIncluded && isSelected && (addOn.perUnit || ['laundry', 'linen_change', 'blinds_detail', 'curtain_dusting', 'full_wall_wash', 'ceiling_fan', 'carpet_steam_room'].includes(addOn.id)) && (
                              <div className="flex items-center gap-0 ml-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={() => {
                                    setAddOnQuantities((prev) => ({
                                      ...prev,
                                      [addOn.id]: Math.max(1, (prev[addOn.id] || 1) - 1),
                                    }));
                                    setManualPrice(null);
                                    setQuoteFinalized(false);
                                  }}
                                >
                                  <Minus className="h-2.5 w-2.5" />
                                </Button>
                                <span className="text-[10px] w-4 text-center font-medium">{quantity}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={() => {
                                    setAddOnQuantities((prev) => ({
                                      ...prev,
                                      [addOn.id]: (prev[addOn.id] || 1) + 1,
                                    }));
                                    setManualPrice(null);
                                    setQuoteFinalized(false);
                                  }}
                                >
                                  <Plus className="h-2.5 w-2.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        </div>
      </div>

      {/* RIGHT COLUMN: Quote Breakdown (Sticky) */}
      <div className="w-full md:w-[40%] bg-muted/30 border-l flex flex-col">
        <div className="p-5 flex-1 flex flex-col overflow-hidden">
          <div className="bg-card border rounded-xl shadow-sm p-5 flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h2 className="font-bold text-lg tracking-tight">Quote Breakdown</h2>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopyBreakdown} disabled={quote.requiresCustomQuote && quote.total === 0}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy breakdown</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Scrollable breakdown */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">

              {/* Custom quote required */}
              {quote.requiresCustomQuote && quote.total === 0 && (
                <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  <AlertTriangle className="h-4 w-4 inline mr-1.5 -mt-0.5" />
                  <strong>Custom quote required</strong> — {quote.customQuoteReason || 'Site visit recommended'}
                  <div className="mt-2">
                    <Label className="text-xs">Manual price override:</Label>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-sm font-medium">$</span>
                      <Input
                        type="number"
                        className="h-7 w-28 text-sm"
                        placeholder="Enter price"
                        value={manualPrice ?? ''}
                        onChange={(e) => setManualPrice(e.target.value === '' ? null : parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Normal breakdown */}
              {!(quote.requiresCustomQuote && quote.total === 0) && (
                <>
                  {/* Base Package */}
                  <div>
                    <h4 className="text-[10px] font-semibold uppercase text-muted-foreground mb-1.5">Base Package</h4>
                    <div className="flex justify-between text-sm">
                      <span>{PACKAGE_LABELS[selectedPackage]}</span>
                      <span className="font-medium">
                        {quote.isRange
                          ? `$${(quote.basePrice as [number, number])[0]}–$${(quote.basePrice as [number, number])[1]}`
                          : `$${(quote.basePrice as number).toFixed(2)}`}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {PROPERTY_TYPE_LABELS[propertyType]} · {quote.sizeBandLabel}
                      {quote.isRange && ' · confirmed on arrival'}
                    </p>
                  </div>

                  {/* Bathroom Adjustment */}
                  {quote.bathroomAdjustment > 0 && (
                    <div>
                      <h4 className="text-[10px] font-semibold uppercase text-muted-foreground mb-1.5">Bathroom Adjustment</h4>
                      <div className="flex justify-between text-sm text-slate-700">
                        <span>Extra bathrooms</span>
                        <span>+${quote.bathroomAdjustment.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {/* Frequency Discount */}
                  {typeof quote.frequencyDiscount === 'number' && quote.frequencyDiscount < 0 && (
                    <div>
                      <h4 className="text-[10px] font-semibold uppercase text-muted-foreground mb-1.5">Frequency Discount</h4>
                      <div className="flex justify-between text-sm text-green-700">
                        <span>{FREQUENCY_LABELS[frequency]} ({Math.abs(quote.frequencyDiscountPercent * 100)}% off)</span>
                        <span>${quote.frequencyDiscount.toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {/* Add-ons */}
                  {quote.addOns.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-semibold uppercase text-muted-foreground mb-1.5">Add-Ons</h4>
                      {quote.addOns.map((a) => (
                        <div key={a.id} className="flex justify-between text-xs mb-1">
                          <span className={a.price === 'included' ? 'text-green-700' : a.price === 'custom' ? 'text-amber-700' : 'text-slate-700'}>
                            {a.label}
                            {a.quantity > 1 && ` (×${a.quantity})`}
                          </span>
                          <span className={`font-medium ${a.price === 'included' ? 'text-green-600' : a.price === 'custom' ? 'text-amber-600' : ''}`}>
                            {a.price === 'included'
                              ? 'Included'
                              : a.price === 'custom'
                              ? 'Custom'
                              : `+$${(a.price as number).toFixed(2)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Percentage surcharges */}
                  {quote.percentageSurcharges.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-semibold uppercase text-muted-foreground mb-1.5">Surcharges</h4>
                      {quote.percentageSurcharges.map((s) => (
                        <div key={s.id} className="flex justify-between text-xs text-orange-700 mb-1">
                          <span>{s.label} ({(s.percent * 100).toFixed(1)}%)</span>
                          <span>+${s.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <hr />

                  {/* Total */}
                  <div>
                    <div className="flex justify-between items-center text-2xl font-bold text-primary mb-2">
                      <span>TOTAL</span>
                      {quote.isRange ? (
                        <span>{displayTotal}</span>
                      ) : (
                        <div className="flex items-center">
                          <span className="mr-1">$</span>
                          <Input
                            type="number"
                            className="w-28 text-xl font-bold h-10 text-right focus-visible:ring-1"
                            value={manualPrice !== null ? manualPrice : (quote.total as number)}
                            onChange={(e) => {
                              setManualPrice(e.target.value === '' ? null : parseFloat(e.target.value) || 0);
                              setQuoteFinalized(false);
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {frequency !== 'one_time' && frequencyEnabled && (
                      <p className="text-[10px] text-muted-foreground">per visit</p>
                    )}

                    {quote.isRange && (
                      <p className="text-[10px] text-muted-foreground mt-1">Final price confirmed once our team assesses the property on arrival.</p>
                    )}
                  </div>

                  {/* Flags */}
                  {quote.requires2PersonCrewFlag && (
                    <div className="p-2 rounded-md bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      Estimated 12+ hours — flag for 2-person crew.
                    </div>
                  )}

                  {quote.requiresVacancyConfirmation && !vacancyConfirmed && (
                    <div className="p-2 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      Vacancy confirmation required to finalize.
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Actions — pinned to bottom */}
            <div className="mt-4 pt-3 border-t space-y-2 shrink-0">
              <Button
                className="w-full text-sm font-bold"
                size="lg"
                onClick={handleGenerateQuote}
                disabled={
                  !customerName ||
                  loading ||
                  (quote.requiresCustomQuote && quote.total === 0 && manualPrice === null) ||
                  (selectedPackage === 'move_in_out' && !vacancyConfirmed) ||
                  quote.unresolvedCustomAddOns.length > 0
                }
              >
                {loading ? 'Generating...' : 'Generate Quote & Lead'}
              </Button>

              <Button
                variant="outline"
                className="w-full text-xs"
                onClick={handleCopyScopeOfWork}
                disabled={quote.requiresCustomQuote && quote.total === 0 && manualPrice === null}
              >
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                Copy Scope of Work
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Small helper to avoid importing from constants in the JSX
const FREQUENCY_DISCOUNT_MAP: Record<Frequency, number> = {
  one_time: 0,
  monthly: 0.05,
  biweekly: 0.10,
  weekly: 0.15,
};
