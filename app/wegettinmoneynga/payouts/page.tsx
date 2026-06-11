'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, CheckCircle, Clock } from 'lucide-react';
import { MetricCard } from '@/components/shared/MetricCard';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { SERVICE_TYPE_LABELS } from '@/types';
import type { ContractorPayout } from '@/types';

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<ContractorPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<ContractorPayout | null>(null);
  const [payoutRef, setPayoutRef] = useState('');
  const [marking, setMarking] = useState(false);

  async function fetchPayouts() {
    try {
      // Fetch completed jobs with contractor assignment to compute payouts
      const res = await fetch('/api/jobs?status=completed');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load jobs');
      }
      const jobs = await res.json();

      // Build synthetic payout records from completed jobs
      const payoutRecords: ContractorPayout[] = (Array.isArray(jobs) ? jobs : [])
        .filter((j: any) => j.assigned_contractor_id && j.contractor)
        .map((j: any) => ({
          id: j.id,
          job_id: j.id,
          contractor_id: j.assigned_contractor_id,
          amount: (j.quoted_price || 0) * (j.contractor?.payout_rate || 0.7),
          payout_rate: j.contractor?.payout_rate || 0.7,
          status: j.status === 'paid_out' ? 'completed' as const : 'pending' as const,
          payout_method: 'e-transfer',
          payout_reference: null,
          paid_at: null,
          notes: null,
          created_at: j.created_at,
          job: j,
          contractor: j.contractor,
        }));

      setPayouts(payoutRecords);
    } catch (err: any) {
      console.error('Error fetching payouts:', err);
      toast.error(err.message || 'Failed to load payouts');
    } finally {
      setLoading(false);
    }
  }
  // fetchPayouts is available for refresh if needed
  void fetchPayouts;

  useEffect(() => {
    // Also fetch reviewed jobs
    async function loadAll() {
      try {
        const [completedRes, reviewedRes, paidOutRes] = await Promise.all([
          fetch('/api/jobs?status=completed'),
          fetch('/api/jobs?status=reviewed'),
          fetch('/api/jobs?status=paid_out'),
        ]);

        const [completedJobs, reviewedJobs, paidOutJobs] = await Promise.all([
          completedRes.ok ? completedRes.json() : [],
          reviewedRes.ok ? reviewedRes.json() : [],
          paidOutRes.ok ? paidOutRes.json() : [],
        ]);

        const allJobs = [
          ...(Array.isArray(completedJobs) ? completedJobs : []),
          ...(Array.isArray(reviewedJobs) ? reviewedJobs : []),
          ...(Array.isArray(paidOutJobs) ? paidOutJobs : []),
        ];

        const payoutRecords: ContractorPayout[] = allJobs
          .filter((j: any) => j.assigned_contractor_id && j.contractor)
          .map((j: any) => ({
            id: j.id,
            job_id: j.id,
            contractor_id: j.assigned_contractor_id,
            amount: (j.quoted_price || 0) * (j.contractor?.payout_rate || 0.7),
            payout_rate: j.contractor?.payout_rate || 0.7,
            status: j.status === 'paid_out' ? 'completed' as const : 'pending' as const,
            payout_method: 'e-transfer',
            payout_reference: null,
            paid_at: null,
            notes: null,
            created_at: j.created_at,
            job: j,
            contractor: j.contractor,
          }));

        setPayouts(payoutRecords);
      } catch {
        toast.error('Failed to load payout data');
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  async function handleMarkPaid() {
    if (!selectedPayout || !payoutRef.trim()) {
      toast.error('Payout reference is required');
      return;
    }
    setMarking(true);
    try {
      const res = await fetch(`/api/payouts/${selectedPayout.id}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payout_reference: payoutRef.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to mark as paid');
      }

      // Update local state
      setPayouts(prev =>
        prev.map(p =>
          p.id === selectedPayout.id
            ? { ...p, status: 'completed' as const, payout_reference: payoutRef.trim() }
            : p
        )
      );
      toast.success('Payout marked as paid');
      setMarkPaidOpen(false);
      setPayoutRef('');
      setSelectedPayout(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to mark as paid');
    } finally {
      setMarking(false);
    }
  }

  const pendingPayouts = payouts.filter(p => p.status === 'pending');
  const completedPayouts = payouts.filter(p => p.status === 'completed');
  const pendingTotal = pendingPayouts.reduce((sum, p) => sum + p.amount, 0);
  const completedTotal = completedPayouts.reduce((sum, p) => sum + p.amount, 0);
  const uniqueContractors = new Set(payouts.map(p => p.contractor_id)).size;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payouts</h1>
        <p className="text-muted-foreground">Manage contractor payouts</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title="Pending Payouts" value={`$${pendingTotal.toFixed(2)}`} icon={Clock} />
        <MetricCard title="Paid Out" value={`$${completedTotal.toFixed(2)}`} icon={CheckCircle} />
        <MetricCard title="Contractors" value={String(uniqueContractors)} icon={DollarSign} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Pending Payouts
            {pendingPayouts.length > 0 && (
              <Badge variant="secondary">{pendingPayouts.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead>Job #</TableHead>
                <TableHead>Contractor</TableHead>
                <TableHead>Job Date</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Job Price</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Payout</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Loading payouts...
                  </TableCell>
                </TableRow>
              ) : pendingPayouts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No pending payouts
                  </TableCell>
                </TableRow>
              ) : (
                pendingPayouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell className="font-mono text-xs">{payout.job?.job_number || '—'}</TableCell>
                    <TableCell className="text-sm">{payout.contractor?.full_name || '—'}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {payout.job?.scheduled_date
                        ? format(new Date(payout.job.scheduled_date), 'MMM d, yyyy')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {payout.job?.service_type ? SERVICE_TYPE_LABELS[payout.job.service_type] : '—'}
                    </TableCell>
                    <TableCell className="text-xs font-medium">${payout.job?.quoted_price?.toFixed(2) || '0.00'}</TableCell>
                    <TableCell className="text-xs">{(payout.payout_rate * 100).toFixed(0)}%</TableCell>
                    <TableCell className="text-sm font-bold text-emerald-600">${payout.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedPayout(payout);
                          setMarkPaidOpen(true);
                        }}
                      >
                        Mark Paid
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {completedPayouts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Completed Payouts
              <Badge variant="secondary">{completedPayouts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Job #</TableHead>
                  <TableHead>Contractor</TableHead>
                  <TableHead>Job Date</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Payout</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedPayouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell className="font-mono text-xs">{payout.job?.job_number || '—'}</TableCell>
                    <TableCell className="text-sm">{payout.contractor?.full_name || '—'}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {payout.job?.scheduled_date
                        ? format(new Date(payout.job.scheduled_date), 'MMM d, yyyy')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {payout.job?.service_type ? SERVICE_TYPE_LABELS[payout.job.service_type] : '—'}
                    </TableCell>
                    <TableCell className="text-sm font-bold">${payout.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Paid
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Mark Paid Dialog */}
      <Dialog open={markPaidOpen} onOpenChange={setMarkPaidOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Payout as Paid</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="rounded-lg bg-muted p-3 space-y-1">
              <p className="text-sm font-medium">{selectedPayout?.contractor?.full_name}</p>
              <p className="text-xs text-muted-foreground">
                Job #{selectedPayout?.job?.job_number} — ${selectedPayout?.amount.toFixed(2)}
              </p>
            </div>
            <div>
              <Label htmlFor="payout-ref">E-Transfer / Payment Reference</Label>
              <Input
                id="payout-ref"
                placeholder="e.g. Interac e-Transfer confirmation #"
                value={payoutRef}
                onChange={(e) => setPayoutRef(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMarkPaidOpen(false)}>Cancel</Button>
              <Button onClick={handleMarkPaid} disabled={marking || !payoutRef.trim()}>
                {marking ? 'Processing...' : 'Confirm Paid'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
