'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { Customer } from '@/types';
import Link from 'next/link';

export default function CustomerDetailPage() {
  const params = useParams();
  const [customer, setCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    async function fetchCustomer() {
      const res = await fetch('/api/customers');
      const data = await res.json();
      const found = (Array.isArray(data) ? data : []).find((c: any) => c.id === params.id);
      setCustomer(found ?? null);
    }
    fetchCustomer();
  }, [params.id]);

  if (!customer) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/wegettinmoneynga/customers"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link>
        <h1 className="text-2xl font-bold">{customer.full_name}</h1>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Contact Info</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{customer.email}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{customer.phone}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Address</span><span>{customer.address_line1 ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">City</span><span>{customer.city ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Postal Code</span><span>{customer.postal_code ?? '—'}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Internal Notes</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{customer.notes ?? 'No notes'}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
