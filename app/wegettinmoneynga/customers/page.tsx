'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Customer } from '@/types';
import Link from 'next/link';
import { deleteCustomerAction } from './actions';
import { toast } from 'sonner';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function fetchCustomers() {
    const res = await fetch('/api/customers');
    const data = await res.json();
    setCustomers(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    fetchCustomers();
  }, []);

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
        <p className="text-muted-foreground">{customers.length} customers</p>
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
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : customers.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No customers yet</TableCell></TableRow>
              ) : customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.full_name}</TableCell>
                  <TableCell className="text-xs">{c.email}</TableCell>
                  <TableCell className="text-xs">{c.phone}</TableCell>
                  <TableCell className="text-xs">{c.city ?? '—'}</TableCell>
                  <TableCell className="text-xs">{c.is_active ? '✓ Active' : 'Inactive'}</TableCell>
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
