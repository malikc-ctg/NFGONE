'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Star } from 'lucide-react';
import type { Contractor } from '@/types';
import Link from 'next/link';

export default function ContractorDetailPage() {
  const params = useParams();
  const [contractor, setContractor] = useState<Contractor | null>(null);

  useEffect(() => {
    async function fetchContractor() {
      const res = await fetch('/api/contractors');
      const data = await res.json();
      const found = (Array.isArray(data) ? data : []).find((c: any) => c.id === params.id);
      setContractor(found ?? null);
    }
    fetchContractor();
  }, [params.id]);

  if (!contractor) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/contractors"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link>
        <div>
          <h1 className="text-2xl font-bold">{contractor.full_name}</h1>
          <div className="flex gap-2 mt-1">
            <Badge variant="outline" className="capitalize">{contractor.tier}</Badge>
            <Badge variant="outline" className={`capitalize ${contractor.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{contractor.status}</Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{contractor.email}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{contractor.phone}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Zone</span><span>{(contractor as any).zone?.name ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Vehicle</span><span>{contractor.has_vehicle ? 'Yes' : 'No'}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Performance</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center"><span className="text-muted-foreground">Score</span><span className="flex items-center gap-1"><Star className="h-4 w-4 text-amber-500" /><span className="font-bold text-lg">{contractor.score}</span>/5.00</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Payout Rate</span><span>{(contractor.payout_rate * 100).toFixed(0)}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Max Jobs/Day</span><span>{contractor.max_jobs_per_day}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Own Supplies</span><span>{contractor.brings_own_supplies ? 'Yes' : 'No'}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Compliance</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Background Check</span><span>{contractor.background_check_cleared ? '✓ Cleared' : '✗ Pending'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Insurance</span><span>{contractor.insurance_on_file ? '✓ On File' : '✗ Missing'}</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
