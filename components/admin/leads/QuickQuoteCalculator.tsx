'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Calculator } from 'lucide-react';
import { DEFAULT_PRICING, SERVICE_TYPE_LABELS } from '@/types';
import type { ServiceType, AddOn } from '@/types';

const ADD_ON_OPTIONS: { value: AddOn; label: string; price: number }[] = [
  { value: 'inside_fridge', label: 'Inside Fridge', price: 30 },
  { value: 'inside_oven', label: 'Inside Oven', price: 30 },
  { value: 'inside_cabinets', label: 'Inside Cabinets', price: 40 },
  { value: 'baseboards', label: 'Baseboards', price: 25 },
  { value: 'interior_windows', label: 'Interior Windows', price: 50 },
];

export function QuickQuoteCalculator() {
  const [open, setOpen] = useState(false);
  const [serviceType, setServiceType] = useState<ServiceType>('standard_clean');
  const [bedrooms, setBedrooms] = useState<number>(2);
  const [bathrooms, setBathrooms] = useState<number>(1);
  const [hasPets, setHasPets] = useState(false);
  const [addOns, setAddOns] = useState<AddOn[]>([]);

  // Fixed multipliers based on backend logic
  const BEDROOM_ADDER = 15;
  const BATHROOM_ADDER = 10;
  const PETS_ADDER = 20;

  // Live calculation
  const basePrice = DEFAULT_PRICING[serviceType] || 0;
  
  const extraBedrooms = Math.max(0, bedrooms - 2);
  const extraBedroomsPrice = extraBedrooms * BEDROOM_ADDER;
  
  const extraBathrooms = Math.max(0, bathrooms - 1);
  const extraBathroomsPrice = extraBathrooms * BATHROOM_ADDER;

  const petsPrice = hasPets ? PETS_ADDER : 0;

  const addOnsPrice = addOns.reduce((total, addOnVal) => {
    const opt = ADD_ON_OPTIONS.find(o => o.value === addOnVal);
    return total + (opt ? opt.price : 0);
  }, 0);

  const finalPrice = basePrice + extraBedroomsPrice + extraBathroomsPrice + petsPrice + addOnsPrice;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Calculator className="h-4 w-4 mr-2" />
          Quick Quote
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Quick Quote Calculator</DialogTitle>
          <DialogDescription>
            Calculate pricing dynamically while on the phone with a customer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="space-y-4">
            <div>
              <Label>Service Type</Label>
              <Select value={serviceType} onValueChange={(v) => setServiceType(v as ServiceType)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SERVICE_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Bedrooms</Label>
                <Input 
                  type="number" 
                  min={1} 
                  value={bedrooms} 
                  onChange={(e) => setBedrooms(parseInt(e.target.value) || 1)} 
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Bathrooms</Label>
                <Input 
                  type="number" 
                  min={1} 
                  value={bathrooms} 
                  onChange={(e) => setBathrooms(parseInt(e.target.value) || 1)} 
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Checkbox 
                id="pets" 
                checked={hasPets} 
                onCheckedChange={(c) => setHasPets(!!c)} 
              />
              <Label htmlFor="pets" className="font-medium cursor-pointer">Has Pets</Label>
            </div>

            <div className="pt-2">
              <Label className="mb-2 block">Add-ons</Label>
              <div className="grid grid-cols-2 gap-3">
                {ADD_ON_OPTIONS.map((opt) => (
                  <div key={opt.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`addon-${opt.value}`}
                      checked={addOns.includes(opt.value)}
                      onCheckedChange={(checked) => {
                        if (checked) setAddOns([...addOns, opt.value]);
                        else setAddOns(addOns.filter(a => a !== opt.value));
                      }}
                    />
                    <Label htmlFor={`addon-${opt.value}`} className="text-sm cursor-pointer">
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h4 className="font-semibold text-sm mb-3">Price Breakdown</h4>
            
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Base Price ({SERVICE_TYPE_LABELS[serviceType]})</span>
              <span>${basePrice.toFixed(2)}</span>
            </div>
            
            {extraBedrooms > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Extra Bedrooms ({extraBedrooms})</span>
                <span>${extraBedroomsPrice.toFixed(2)}</span>
              </div>
            )}
            
            {extraBathrooms > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Extra Bathrooms ({extraBathrooms})</span>
                <span>${extraBathroomsPrice.toFixed(2)}</span>
              </div>
            )}
            
            {hasPets && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pets Surcharge</span>
                <span>${petsPrice.toFixed(2)}</span>
              </div>
            )}

            {addOns.map(addon => {
              const opt = ADD_ON_OPTIONS.find(o => o.value === addon);
              if (!opt) return null;
              return (
                <div key={addon} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{opt.label}</span>
                  <span>${opt.price.toFixed(2)}</span>
                </div>
              );
            })}

            <div className="border-t pt-2 mt-3 flex justify-between font-bold text-lg">
              <span>Total Quote</span>
              <span>${finalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
