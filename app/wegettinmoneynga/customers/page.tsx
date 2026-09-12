'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Customer } from '@/types';
import Link from 'next/link';
import { deleteCustomerAction } from './actions';
import { toast } from 'sonner';
import { Search, UserCheck } from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  async function fetchCustomers() {
    const res = await fetch('/api/customers');
    const data = await res.json();
    setCustomers(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Deduplication safeguard: Ensure each customer displayed is unique by real email or normalized phone
  const deduplicatedCustomers = useMemo(() => {
    const seen = new Set<string>();
    return customers.filter((c) => {
      const email = (c.email || '').toLowerCase().trim();
      const isPlaceholder = email.startsWith('no-email-');
      const phoneDigits = (c.phone || '').replace(/\D/g, '');

      let key = `id:${c.id}`;
      if (!isPlaceholder && email) {
        key = `email:${email}`;
      } else if (phoneDigits.length >= 10) {
        key = `phone:${phoneDigits.slice(-10)}`;
      }

      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return deduplicatedCustomers;
    return deduplicatedCustomers.filter(
      (c) =>
        c.full_name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.city?.toLowerCase().includes(q)
    );
  }, [deduplicatedCustomers, search]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to completely delete ${name}? This action cannot be undone and will also delete their login account.`)) {
      return;
    }

    setDeletingId(id);
    const result = await deleteCustomerAction(id);
    
    if (result.success) {
      toast.success('Customer deleted successfully');
      setCustomers(customers.filter(c => c.id !== id));
    } else {
      toast.error(result.error || 'Failed to delete customer');
    }
    setDeletingId(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            {filteredCustomers.length} active customer{filteredCustomers.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Loading customers...
                  </TableCell>
                </TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {search ? 'No matching customers found' : 'No customers yet'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.full_name}</TableCell>
                    <TableCell className="text-xs">
                      {c.email?.startsWith('no-email-') ? (
                        <span className="text-muted-foreground italic">No email provided</span>
                      ) : (
                        c.email
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{c.phone || '—'}</TableCell>
                    <TableCell className="text-xs">{c.city ?? '—'}</TableCell>
                    <TableCell className="text-xs">
                      <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                        <UserCheck className="h-3 w-3" />
                        Active
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Link href={`/wegettinmoneynga/customers/${c.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => handleDelete(c.id, c.full_name)}
                        disabled={deletingId === c.id}
                      >
                        {deletingId === c.id ? 'Deleting...' : 'Delete'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
