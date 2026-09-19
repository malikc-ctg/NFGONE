'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AddressAutocomplete } from '@/components/ui/address-autocomplete';

export interface LeadContactData {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  address: string;
  source: string;
}

export function LeadContactFields({
  contact,
  onChange,
}: {
  contact: LeadContactData;
  onChange: (field: keyof LeadContactData, value: string) => void;
}) {
  return (
    <section className="space-y-3">
      <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
        Contact Information
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Full Name *</Label>
          <Input
            value={contact.customerName}
            onChange={(e) => onChange('customerName', e.target.value)}
            placeholder="John Doe"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Phone</Label>
          <Input
            value={contact.customerPhone}
            onChange={(e) => onChange('customerPhone', e.target.value)}
            placeholder="(555) 555-5555"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Email</Label>
          <Input
            type="email"
            value={contact.customerEmail}
            onChange={(e) => onChange('customerEmail', e.target.value)}
            placeholder="john@example.com"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Address / City</Label>
          <AddressAutocomplete
            value={contact.address}
            onChange={(e) => onChange('address', e.target.value)}
            onAddressSelect={(addr) =>
              onChange('address', `${addr.address_line1}, ${addr.city}`)
            }
          />
        </div>
        <div>
          <Label className="text-xs">Lead Source *</Label>
          <Select
            value={contact.source}
            onValueChange={(val) => onChange('source', val)}
          >
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
  );
}
