'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign } from 'lucide-react';
import { MetricCard } from '@/components/shared/MetricCard';

export default function PayoutsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payouts</h1>
        <p className="text-muted-foreground">Manage contractor payouts</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title="Pending Payouts" value="$0.00" icon={DollarSign} />
        <MetricCard title="Paid This Month" value="$0.00" icon={DollarSign} />
        <MetricCard title="Total Contractors" value="0" icon={DollarSign} />
      </div>

      <Card>
        <CardHeader><CardTitle>Pending Payouts</CardTitle></CardHeader>
        <CardContent>
          <Table>
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
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No pending payouts
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
