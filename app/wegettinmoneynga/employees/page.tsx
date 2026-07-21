'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Star, Trash2, ShieldCheck, ShieldAlert, ShieldX, Eye, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { Employee } from '@/types';
import Link from 'next/link';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [zones, setZones] = useState<any[]>([]);
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '',
    tier: 'basic', payout_rate: '0.700', max_jobs_per_day: '2',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');

  async function fetchEmployees() {
    const res = await fetch('/api/employees');
    const data = await res.json();
    setEmployees(Array.isArray(data) ? data : []);
    setLoadingEmployees(false);
  }

  async function fetchApplications() {
    const res = await fetch('/api/wegettinmoneynga/employee-applications');
    const data = await res.json();
    setApplications(Array.isArray(data) ? data : []);
    setLoadingApplications(false);
  }

  useEffect(() => {
    fetchEmployees();
    fetchApplications();
    fetch('/api/zones').then(r => r.json()).then(d => setZones(Array.isArray(d) ? d : []));
  }, []);

  async function handleSubmit() {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/employees/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          payout_rate: parseFloat(form.payout_rate),
          max_jobs_per_day: parseInt(form.max_jobs_per_day),
        }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send invite');
      
      toast.success('Employee invited! Email sent.');
      setDrawerOpen(false);
      setForm({
        full_name: '', email: '', phone: '',
        tier: 'basic', payout_rate: '0.700', max_jobs_per_day: '2',
      });
      fetchEmployees();
    } catch (err: any) { 
      toast.error(err.message || 'Failed to invite employee'); 
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to completely delete the employee "${name}"? This action cannot be undone and will remove their ability to log in.`)) return;
    
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Employee deleted permanently');
      fetchEmployees();
    } catch {
      toast.error('Failed to delete employee');
    }
  }

  async function handleActivate(id: string, name: string) {
    if (!confirm(`Are you sure you want to activate "${name}"? They will be able to receive and accept jobs.`)) return;
    
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' })
      });
      if (!res.ok) throw new Error('Failed to activate');
      toast.success('Employee activated successfully');
      fetchEmployees();
    } catch {
      toast.error('Failed to activate employee');
    }
  }


  const getStatusBadgeVariant = (status: string) => {
    switch(status) {
      case 'New': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Under Review': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'Rejected': return 'bg-red-100 text-red-700 border-red-200';
      case 'Needs More Info': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const filteredApplications = statusFilter === 'All' 
    ? applications 
    : applications.filter(a => a.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground">Manage service providers and review applications</p>
        </div>
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Employee</Button></SheetTrigger>
          <SheetContent className="w-[420px] overflow-y-auto">
            <SheetHeader><SheetTitle>New Employee</SheetTitle></SheetHeader>
            <div className="space-y-4 mt-6">
              <div><Label>Full Name</Label><Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Tier</Label>
                <Select value={form.tier} onValueChange={v => setForm({ ...form, tier: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Payout Rate (%)</Label><Input value={form.payout_rate} onChange={e => setForm({ ...form, payout_rate: e.target.value })} /></div>
              <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
                {isSubmitting ? 'Sending Invite...' : 'Send Invite'}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="active">Active Employees ({employees.length})</TabsTrigger>
          <TabsTrigger value="applications">Applications ({applications.filter(a => a.status === 'New').length} New)</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Zone</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Supplies</TableHead>
                    <TableHead>Insurance</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingEmployees ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : employees.length === 0 ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No employees yet</TableCell></TableRow>
                  ) : employees.map(c => {
                    let insuranceStatus = 'missing';
                    let insuranceLabel = 'Missing';
                    try {
                      const notes = c.notes ? JSON.parse(c.notes) : {};
                      const ins = notes.insurance_details;
                      if (ins?.status === 'verified') { insuranceStatus = 'verified'; insuranceLabel = 'Verified'; }
                      else if (ins?.file_url) { insuranceStatus = 'pending'; insuranceLabel = 'Pending'; }
                    } catch { /* no-op */ }
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.full_name}</TableCell>
                        <TableCell className="text-xs">{c.phone}</TableCell>
                        <TableCell className="text-xs">{(c as any).zone?.name ?? '—'}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize text-xs">{c.tier}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className={`text-xs capitalize ${c.status === 'active' ? 'bg-green-100 text-green-700' : c.status === 'probation' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{c.status}</Badge></TableCell>
                        <TableCell className="text-xs"><Star className="h-3 w-3 inline mr-1 text-amber-500" />{c.score}</TableCell>
                        <TableCell className="text-xs">{(c.payout_rate * 100).toFixed(0)}%</TableCell>
                        <TableCell className="text-xs">{c.brings_own_supplies ? '✓' : '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs flex items-center gap-1 w-fit ${
                            insuranceStatus === 'verified' ? 'bg-green-100 text-green-700 border-green-200'
                            : insuranceStatus === 'pending' ? 'bg-amber-100 text-amber-700 border-amber-200'
                            : 'bg-red-50 text-red-600 border-red-200'
                          }`}>
                            {insuranceStatus === 'verified' ? <ShieldCheck className="h-3 w-3" /> : insuranceStatus === 'pending' ? <ShieldAlert className="h-3 w-3" /> : <ShieldX className="h-3 w-3" />}
                            {insuranceLabel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {c.status === 'invited' && insuranceStatus === 'verified' && (
                              <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleActivate(c.id, c.full_name)}>
                                <Check className="h-4 w-4 mr-1" /> Activate
                              </Button>
                            )}
                            <Link href={`/wegettinmoneynga/employees/${c.id}`}>
                              <Button variant="ghost" size="sm">View</Button>
                            </Link>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(c.id, c.full_name)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications">
          <Card>
            <div className="p-4 border-b border-border flex gap-4 items-center">
              <Label className="text-muted-foreground">Filter Status:</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Applications</SelectItem>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Under Review">Under Review</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Needs More Info">Needs More Info</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant Name</TableHead>
                    <TableHead>Business Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Primary City</TableHead>
                    <TableHead>GBP</TableHead>
                    <TableHead>Insurance</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingApplications ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading applications...</TableCell></TableRow>
                  ) : filteredApplications.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No applications found.</TableCell></TableRow>
                  ) : filteredApplications.map(app => (
                    <TableRow key={app.id}>
                      <TableCell className="font-medium">{app.full_name}</TableCell>
                      <TableCell>{app.business_name || '—'}</TableCell>
                      <TableCell className="text-xs">{app.applicant_type}</TableCell>
                      <TableCell className="text-xs">{app.primary_city}</TableCell>
                      <TableCell className="text-xs">{app.has_google_business_profile === 'Yes' ? '✅' : '❌'}</TableCell>
                      <TableCell className="text-xs">{app.has_liability_insurance === 'Yes' ? '✅' : (app.has_liability_insurance === 'In Progress' ? '⏳' : '❌')}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(app.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${getStatusBadgeVariant(app.status)}`}>
                          {app.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link href={`/wegettinmoneynga/employees/applications/${app.id}`}>
                          <Button variant="ghost" size="sm" className="flex items-center gap-2">
                            <Eye className="h-4 w-4" /> View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
