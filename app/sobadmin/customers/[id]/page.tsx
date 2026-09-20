'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Plus,
  Repeat,
  Calendar,
  Clock,
  Sparkles,
  DollarSign,
  Building2,
  Home,
  Phone,
  Mail,
  MapPin,
  Key,
  Shield,
  CreditCard,
  UserCheck,
  Edit2,
  FileText,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  PawPrint,
  Share2,
  User,
  HelpCircle,
} from 'lucide-react';
import type { Customer, RecurringBooking } from '@/types';
import Link from 'next/link';
import { AddCustomerServiceModal } from '@/components/admin/customers/AddCustomerServiceModal';
import { CustomerFormModal } from '@/components/admin/customers/CustomerFormModal';
import { formatRecurrenceSchedule, DAY_LABELS } from '@/lib/recurring-utils';
import { format12Hour } from '@/lib/time-utils';
import { toast } from 'sonner';

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [recurringBookings, setRecurringBookings] = useState<RecurringBooking[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // QBO Data
  const [qboData, setQboData] = useState<{ balance: number; lifetimeSpend: number } | null>(null);

  // Modals
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [serviceModalTab, setServiceModalTab] = useState<'recurring' | 'one_time'>('recurring');
  const [editModalOpen, setEditModalOpen] = useState(false);

  const fetchCustomerData = useCallback(async () => {
    try {
      // Fetch comprehensive customer payload
      const res = await fetch(`/api/customers/${customerId}`);
      if (!res.ok) {
        throw new Error('Customer not found');
      }
      const data = await res.json();
      setCustomer(data.customer);
      setJobs(data.jobs || []);
      setRecurringBookings(data.recurring || []);
      setMetrics(data.metrics || null);

      // Fetch QBO financial data
      try {
        const qboRes = await fetch(`/api/integrations/quickbooks/customers/${customerId}`);
        if (qboRes.ok) {
          const qboJson = await qboRes.json();
          setQboData(qboJson);
        }
      } catch (e) {
        console.error('Failed to load QBO data', e);
      }
    } catch (e: any) {
      console.error('Failed to fetch customer data', e);
      toast.error(e.message || 'Error loading customer');
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    fetchCustomerData();
  }, [fetchCustomerData]);

  const openAddService = (tab: 'recurring' | 'one_time') => {
    setServiceModalTab(tab);
    setServiceModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading customer profile...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-16 space-y-4">
        <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
        <h2 className="text-xl font-bold">Customer Not Found</h2>
        <p className="text-sm text-muted-foreground">The requested customer record does not exist or was deleted.</p>
        <Link href="/sobadmin/customers">
          <Button variant="outline">Return to Directory</Button>
        </Link>
      </div>
    );
  }

  const isCommercial = customer.customer_type === 'commercial' || Boolean(customer.company_name);
  const nextClean = metrics?.next_clean;
  const lifetimeSpend = qboData?.lifetimeSpend ?? metrics?.lifetime_spend ?? 0;
  const openBalance = qboData?.balance ?? 0;

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/sobadmin/customers">
            <Button variant="ghost" size="sm" className="h-9 px-2 text-muted-foreground">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {isCommercial ? customer.company_name || customer.full_name : customer.full_name}
              </h1>

              {isCommercial ? (
                <Badge className="bg-purple-100 hover:bg-purple-100 text-purple-800 border-purple-200 text-xs flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  Commercial Enterprise
                </Badge>
              ) : (
                <Badge className="bg-blue-100 hover:bg-blue-100 text-blue-800 border-blue-200 text-xs flex items-center gap-1">
                  <Home className="h-3 w-3" />
                  Residential Client
                </Badge>
              )}

              {customer.billing_terms && customer.billing_terms !== 'due_on_receipt' && (
                <Badge variant="outline" className="text-xs uppercase border-purple-300 text-purple-700">
                  {customer.billing_terms.replace(/_/g, ' ')}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>Account #{customer.id.substring(0, 8)}</span>
              {isCommercial && customer.company_name && (
                <>
                  <span>•</span>
                  <span>
                    Primary Contact: <strong className="text-slate-700">{customer.full_name}</strong>
                  </span>
                </>
              )}
              {customer.zone && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    {customer.zone.name}
                  </span>
                </>
              )}
              <span>•</span>
              <span>Joined {new Date(customer.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {customer.phone && customer.phone !== '—' && (
            <a href={`tel:${customer.phone.replace(/\D/g, '')}`}>
              <Button variant="outline" size="sm" className="h-9 text-xs">
                <Phone className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
                Call
              </Button>
            </a>
          )}

          {customer.email && !customer.email.startsWith('no-email-') && (
            <a href={`mailto:${customer.email}`}>
              <Button variant="outline" size="sm" className="h-9 text-xs">
                <Mail className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
                Email
              </Button>
            </a>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditModalOpen(true)}
            className="h-9 text-xs"
          >
            <Edit2 className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
            Edit Profile
          </Button>

          <Button
            onClick={() => openAddService('recurring')}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-9 text-xs"
          >
            <Repeat className="h-3.5 w-3.5 mr-1.5" />
            + Recurring Contract
          </Button>

          <Button
            onClick={() => openAddService('one_time')}
            variant="outline"
            size="sm"
            className="h-9 text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            + One-Time Clean
          </Button>
        </div>
      </div>

      {/* Metric Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>Lifetime Spend</span>
              <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <p className="text-xl font-bold text-slate-900">${lifetimeSpend.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground">Total invoiced value</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>Subscription MRR</span>
              <Repeat className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <p className="text-xl font-bold text-slate-900">
              {metrics?.has_recurring ? `$${metrics.mrr_amount}/mo` : 'No Contract'}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {recurringBookings.filter((r) => r.is_active).length} active agreement(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>Completed Jobs</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <p className="text-xl font-bold text-slate-900">{metrics?.completed_jobs_count ?? 0}</p>
            <p className="text-[11px] text-muted-foreground">
              {metrics?.last_clean_date ? `Last: ${metrics.last_clean_date}` : 'No completed cleans'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>Account Balance</span>
              <CreditCard className="h-3.5 w-3.5 text-slate-600" />
            </div>
            <p className={`text-xl font-bold ${openBalance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              ${openBalance.toFixed(2)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {openBalance > 0 ? 'Payment pending' : 'Zero balance / Current'}
            </p>
          </CardContent>
        </Card>

        <Card className="col-span-2 sm:col-span-4 lg:col-span-1">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>Referral Program</span>
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            </div>
            <p className="font-mono font-bold text-sm text-blue-700 pt-0.5">
              SOB-{customer.id.substring(0, 6).toUpperCase()}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Credits: ${customer.credit_balance ?? 0} CAD
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 5 Enterprise Customer Workspace Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-slate-100 p-1 rounded-lg w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview" className="text-xs">
            Overview & Snapshot
          </TabsTrigger>
          <TabsTrigger value="specs" className="text-xs">
            {isCommercial ? '🏢 Facility & Access Specs' : '🏠 Home & Access Specs'}
          </TabsTrigger>
          <TabsTrigger value="services" className="text-xs">
            Services & History ({jobs.length})
          </TabsTrigger>
          <TabsTrigger value="billing" className="text-xs">
            Billing & QuickBooks
          </TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs">
            Activity & Rewards
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: OVERVIEW & SNAPSHOT */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Primary Contact Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-blue-600" />
                  Primary Contact & Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-semibold text-slate-800">{customer.full_name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="font-medium text-slate-800">{customer.phone || '—'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-muted-foreground">Email</span>
                  <span>
                    {customer.email?.startsWith('no-email-') ? (
                      <span className="text-muted-foreground italic">No email on file</span>
                    ) : (
                      customer.email
                    )}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-muted-foreground">Street Address</span>
                  <span className="font-medium text-slate-800">
                    {customer.address_line1 || '—'}
                    {customer.address_line2 ? `, ${customer.address_line2}` : ''}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-muted-foreground">City & Postal</span>
                  <span>
                    {customer.city || '—'} {customer.postal_code ? `, ${customer.postal_code}` : ''}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Service Zone</span>
                  <span className="font-medium text-blue-700">{customer.zone?.name || 'Unassigned'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Commercial vs Residential Summary Card */}
            {isCommercial ? (
              <Card className="border-purple-100 bg-purple-50/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-purple-900">
                    <Building2 className="h-4 w-4 text-purple-700" />
                    Commercial Entity Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between py-1 border-b border-purple-100/60">
                    <span className="text-muted-foreground">Company Name</span>
                    <span className="font-bold text-slate-900">{customer.company_name || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-purple-100/60">
                    <span className="text-muted-foreground">Facility Classification</span>
                    <span className="capitalize font-medium text-purple-900">
                      {customer.commercial_facility_type?.replace(/_/g, ' ') || 'Corporate Office'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-purple-100/60">
                    <span className="text-muted-foreground">Facility Size</span>
                    <span className="font-medium">
                      {customer.square_footage ? `${customer.square_footage.toLocaleString()} sq ft` : 'Not specified'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-purple-100/60">
                    <span className="text-muted-foreground">Accounts Payable Contact</span>
                    <span>
                      {customer.accounts_payable_name ? (
                        <strong>{customer.accounts_payable_name}</strong>
                      ) : (
                        <span className="italic text-muted-foreground">Same as primary</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-purple-100/60">
                    <span className="text-muted-foreground">AP Email</span>
                    <span>{customer.accounts_payable_email || customer.email || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Invoicing Terms</span>
                    <Badge variant="outline" className="uppercase text-[10px] border-purple-300 text-purple-800">
                      {customer.billing_terms?.replace(/_/g, ' ') || 'Due on Receipt'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-blue-100 bg-blue-50/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-blue-900">
                    <Home className="h-4 w-4 text-blue-700" />
                    Residential Profile & Home Setup
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between py-1 border-b border-blue-100/60">
                    <span className="text-muted-foreground">Home Configuration</span>
                    <span className="font-semibold text-slate-900">
                      {customer.home_bedrooms ?? jobs[0]?.home_bedrooms ?? 3} Bedrooms /{' '}
                      {customer.home_bathrooms ?? jobs[0]?.home_bathrooms ?? 2} Bathrooms
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-blue-100/60">
                    <span className="text-muted-foreground">Pets in Residence</span>
                    <span className="flex items-center gap-1">
                      {customer.pet_details || jobs[0]?.has_pets ? (
                        <>
                          <PawPrint className="h-3.5 w-3.5 text-amber-600" />
                          <span className="font-medium text-amber-900">
                            {customer.pet_details || 'Yes (see notes)'}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-600">No pets reported</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-blue-100/60">
                    <span className="text-muted-foreground">Entry Code / Lockbox</span>
                    <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                      {customer.access_code || jobs[0]?.access_instructions || 'Hand delivery / In person'}
                    </span>
                  </div>
                  <div className="py-1">
                    <span className="text-muted-foreground text-xs block mb-1">Special Preferences</span>
                    <p className="text-xs bg-white p-2 rounded border border-blue-100 text-slate-700">
                      {customer.special_instructions || 'Standard cleaning preferences apply.'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Next Scheduled Cleaning Card */}
            <Card className="border-emerald-100 bg-emerald-50/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-emerald-900">
                  <Calendar className="h-4 w-4 text-emerald-700" />
                  Next Scheduled Service Visit
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {nextClean ? (
                  <div className="p-3 bg-white rounded-lg border border-emerald-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-emerald-600 text-white text-[10px] capitalize">
                        {nextClean.status.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-xs font-bold text-slate-900">${nextClean.quoted_price} CAD</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-900 capitalize">
                      {nextClean.service_type?.replace(/_/g, ' ')}
                    </div>
                    <div className="text-xs text-slate-600 flex items-center gap-4">
                      <span>Date: <strong>{nextClean.scheduled_date}</strong></span>
                      {nextClean.employee && (
                        <span>Cleaner: <strong>{nextClean.employee.full_name}</strong></span>
                      )}
                    </div>
                    <div className="pt-1">
                      <Link href={`/sobadmin/jobs/${nextClean.id}`}>
                        <Button variant="outline" size="sm" className="w-full text-xs h-8">
                          Open Job Dispatch #{nextClean.id.substring(0, 8)}
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-5 border border-dashed rounded-lg bg-white">
                    <Calendar className="h-7 w-7 text-slate-300 mx-auto mb-1.5" />
                    <p className="text-xs font-medium text-slate-700">No upcoming visits scheduled</p>
                    <p className="text-[11px] text-muted-foreground mb-3">
                      Book their next visit or set up a recurring contract.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => openAddService('one_time')}
                      className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white h-8"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Schedule Next Visit
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Internal Admin Notes Card */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-600" />
                  Internal Staff & Admin Notes
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setEditModalOpen(true)}
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  Edit
                </Button>
              </CardHeader>
              <CardContent>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 min-h-[90px] text-xs text-slate-700 leading-relaxed">
                  {customer.notes || (
                    <span className="text-muted-foreground italic">
                      No internal notes recorded for this customer yet. Use the Edit button to add dispatch notes, billing arrangements, or VIP preferences.
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 2: PROPERTY & ACCESS SPECS */}
        <TabsContent value="specs" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {isCommercial ? 'Commercial Facility & Access Protocols' : 'Residential Home & Property Specs'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {isCommercial
                  ? 'Keycard codes, security alarm disarm instructions, after-hours window, and janitor closet access.'
                  : 'Home entry codes, lockbox location, alarm disarm instructions, and pet handling notes.'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditModalOpen(true)}
              className="text-xs h-8"
            >
              <Edit2 className="h-3.5 w-3.5 mr-1.5" />
              Edit Specs
            </Button>
          </div>

          {isCommercial ? (
            /* COMMERCIAL SPEC CARDS */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-purple-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-purple-900">
                    <Building2 className="h-4 w-4 text-purple-700" />
                    Facility Details & Dimensions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-muted-foreground">Facility Type</span>
                    <span className="font-semibold capitalize text-slate-900">
                      {customer.commercial_facility_type?.replace(/_/g, ' ') || 'Corporate Office'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-muted-foreground">Square Footage</span>
                    <span className="font-semibold text-slate-900">
                      {customer.square_footage ? `${customer.square_footage.toLocaleString()} sq ft` : 'Not recorded'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-muted-foreground">Suite / Floor</span>
                    <span>{customer.address_line2 || 'Full Building / Main'}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-muted-foreground">Specialized Equipment Needed</span>
                    <span className="text-xs font-medium text-purple-800">
                      {customer.commercial_facility_type === 'strip_and_wax' ||
                      customer.commercial_facility_type === 'warehouse'
                        ? 'Buffer / Auto-scrubber required'
                        : 'Commercial Backpack Vacuums & HEPA Mops'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-amber-200 bg-amber-50/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-amber-900">
                    <Shield className="h-4 w-4 text-amber-700" />
                    Security, Alarm & Entry Credentials
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Master Key / Lockbox PIN
                    </span>
                    <div className="p-2.5 bg-white rounded border border-amber-200 font-mono text-sm font-bold text-amber-900">
                      {customer.access_code || 'No keycode on file — Escorted by security'}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Alarm Disarm Protocol & Panel PIN
                    </span>
                    <div className="p-2.5 bg-white rounded border border-amber-200 text-xs text-slate-800">
                      {customer.alarm_instructions || 'No alarm system instructions specified.'}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Janitor Closet, Loading Dock & Parking Rules
                    </span>
                    <div className="p-2.5 bg-white rounded border border-amber-200 text-xs text-slate-800">
                      {customer.parking_instructions || 'Standard visitor or commercial parking.'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            /* RESIDENTIAL SPEC CARDS */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-blue-900">
                    <Home className="h-4 w-4 text-blue-700" />
                    Home Layout & Specifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                    <div>
                      <p className="text-2xl font-bold text-blue-900">
                        {customer.home_bedrooms ?? jobs[0]?.home_bedrooms ?? 3}
                      </p>
                      <p className="text-xs text-muted-foreground">Bedrooms</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-900">
                        {customer.home_bathrooms ?? jobs[0]?.home_bathrooms ?? 2}
                      </p>
                      <p className="text-xs text-muted-foreground">Bathrooms</p>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                      <PawPrint className="h-3.5 w-3.5 text-amber-700" />
                      Pet Profile & Handling
                    </div>
                    <p className="text-xs text-slate-800">
                      {customer.pet_details || (jobs[0]?.has_pets ? 'Pets present in home.' : 'No pets.')}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground">Special Instructions</span>
                    <p className="p-2.5 bg-white rounded border border-slate-200 text-xs text-slate-700">
                      {customer.special_instructions || 'Standard residential cleaning procedures apply.'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Key className="h-4 w-4 text-slate-600" />
                    Access, Door Codes & Parking
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Entry Door / Lockbox PIN
                    </span>
                    <div className="p-2.5 bg-white rounded border border-slate-200 font-mono text-sm font-bold text-blue-900">
                      {customer.access_code || jobs[0]?.access_instructions || 'In-person arrival'}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Alarm Disarm Instructions
                    </span>
                    <div className="p-2.5 bg-white rounded border border-slate-200 text-xs text-slate-800">
                      {customer.alarm_instructions || 'No alarm specified'}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Parking Directions
                    </span>
                    <div className="p-2.5 bg-white rounded border border-slate-200 text-xs text-slate-800">
                      {customer.parking_instructions || 'Driveway parking permitted'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* TAB 3: SERVICES & SUBSCRIPTIONS */}
        <TabsContent value="services" className="space-y-6">
          {/* Recurring Agreements */}
          <Card className="border-blue-100 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <Repeat className="h-5 w-5 text-blue-600" />
                <div>
                  <CardTitle className="text-base">Active Recurring Contracts</CardTitle>
                  <CardDescription className="text-xs">
                    Automated periodic recurring cleaning subscriptions
                  </CardDescription>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => openAddService('recurring')}
                className="bg-blue-600 hover:bg-blue-700 text-xs h-8"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                New Contract
              </Button>
            </CardHeader>
            <CardContent>
              {recurringBookings.length === 0 ? (
                <div className="text-center py-6 border border-dashed rounded-lg bg-slate-50/50">
                  <Repeat className="h-7 w-7 text-slate-300 mx-auto mb-1.5" />
                  <p className="text-xs font-medium text-slate-700">No active recurring agreements</p>
                  <p className="text-[11px] text-muted-foreground mb-3">
                    Customer is not currently subscribed to weekly, bi-weekly, or monthly cleans.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openAddService('recurring')}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs h-8"
                  >
                    Set Up Recurring Clean
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recurringBookings.map((rec) => (
                    <div
                      key={rec.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg border border-slate-200 bg-white hover:border-blue-200 transition-colors gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 capitalize text-sm">
                            {rec.service_type?.replace(/_/g, ' ')}
                          </span>
                          <Badge
                            variant={rec.is_active ? 'default' : 'secondary'}
                            className={rec.is_active ? 'bg-emerald-600 text-white text-[10px]' : 'text-[10px]'}
                          >
                            {rec.is_active ? 'Active Contract' : 'Paused'}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] capitalize text-blue-700 border-blue-200">
                            {rec.frequency}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            {rec.days_of_week && rec.days_of_week.length > 0
                              ? rec.days_of_week
                                  .map((d: any) => DAY_LABELS[d as keyof typeof DAY_LABELS] || d)
                                  .join(', ')
                              : 'Custom schedule'}{' '}
                            @ {rec.preferred_start_time ? format12Hour(rec.preferred_start_time) : '9:00 AM'}
                          </span>
                          {rec.employee && (
                            <span>
                              Cleaner: <strong className="text-slate-700">{rec.employee.full_name}</strong>
                            </span>
                          )}
                          {rec.next_job_date && (
                            <span>
                              Next Run: <strong className="text-blue-700">{rec.next_job_date}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">
                            ${rec.quoted_price}
                            <span className="text-xs font-normal text-muted-foreground">/clean</span>
                          </p>
                          {rec.monthly_amount && (
                            <p className="text-[10px] text-emerald-600 font-semibold">${rec.monthly_amount} MRR</p>
                          )}
                        </div>
                        <Link href="/sobadmin/recurring">
                          <Button variant="ghost" size="sm" className="h-8 text-xs">
                            Manage
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service History & Past Jobs */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Service History & Jobs ({jobs.length})</CardTitle>
                <CardDescription className="text-xs">
                  All past, in-progress, and scheduled cleaning appointments
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openAddService('one_time')}
                className="h-8 text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Schedule Job
              </Button>
            </CardHeader>
            <CardContent>
              {jobs.length === 0 ? (
                <div className="text-center py-8 border border-dashed rounded-lg bg-slate-50/50">
                  <p className="text-xs font-medium text-slate-700">No jobs recorded for this customer.</p>
                  <p className="text-[11px] text-muted-foreground mb-3">
                    Schedule their first service visit using the button below.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => openAddService('one_time')}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Schedule First Clean
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px]">
                      <tr>
                        <th className="px-3 py-2.5 rounded-tl-lg">Date</th>
                        <th className="px-3 py-2.5">Service Type</th>
                        <th className="px-3 py-2.5">Cleaner</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="px-3 py-2.5">Price</th>
                        <th className="px-3 py-2.5 rounded-tr-lg text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {jobs.map((job) => (
                        <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2.5 whitespace-nowrap font-medium">
                            {new Date(job.scheduled_date).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap capitalize">
                            {job.service_type?.replace(/_/g, ' ')}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">
                            {job.employee?.full_name || 'Unassigned'}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                job.status === 'completed' || job.status === 'paid_out'
                                  ? 'bg-green-100 text-green-800'
                                  : job.status === 'cancelled' || job.status === 'no_show'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {job.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap font-semibold text-slate-900">
                            ${job.quoted_price}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-right">
                            <Link href={`/sobadmin/jobs/${job.id}`}>
                              <Button variant="ghost" size="sm" className="h-7 text-xs">
                                View
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: BILLING & QUICKBOOKS */}
        <TabsContent value="billing" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-emerald-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  QuickBooks Financial Ledger
                </CardTitle>
                <CardDescription className="text-xs">
                  Real-time synchronization with QuickBooks Online
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-muted-foreground">Outstanding Balance</span>
                  <span
                    className={`font-bold ${
                      (qboData?.balance ?? 0) > 0 ? 'text-amber-600' : 'text-emerald-600'
                    }`}
                  >
                    ${(qboData?.balance ?? 0).toFixed(2)} CAD
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-muted-foreground">Lifetime Billed</span>
                  <span className="font-bold text-foreground">
                    ${lifetimeSpend.toFixed(2)} CAD
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-muted-foreground">QBO Customer ID</span>
                  <span className="font-mono text-xs">
                    {customer.qbo_customer_id || 'Auto-synced on first invoice'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Tax Status</span>
                  <span>
                    {customer.tax_exempt ? (
                      <Badge className="bg-amber-100 text-amber-800 text-[10px]">Tax-Exempt Entity</Badge>
                    ) : (
                      <span className="text-xs font-medium">Standard HST (13%)</span>
                    )}
                  </span>
                </div>

                <div className="pt-2">
                  <Link href="/sobadmin/finance">
                    <Button variant="outline" size="sm" className="w-full text-xs h-8">
                      <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                      Open Invoicing & AR Dunning Engine
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-slate-600" />
                  Payment Terms & Invoicing Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-muted-foreground">Agreed Payment Terms</span>
                  <Badge variant="outline" className="uppercase text-[10px] border-slate-300">
                    {customer.billing_terms?.replace(/_/g, ' ') || 'Due on Receipt'}
                  </Badge>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-muted-foreground">Accounts Payable Email</span>
                  <span className="font-medium text-slate-800">
                    {customer.accounts_payable_email || customer.email || '—'}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-muted-foreground">Tax Registration #</span>
                  <span className="font-mono text-xs">{customer.tax_id || 'None on file'}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Stripe Customer ID</span>
                  <span className="font-mono text-xs">
                    {customer.stripe_customer_id || 'Created upon checkout'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 5: ACTIVITY & REWARDS */}
        <TabsContent value="timeline" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-blue-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-blue-900">
                  <Sparkles className="h-4 w-4 text-blue-700" />
                  Referral Program & Loyalty Credits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Personal Referral Code</span>
                    <span className="font-mono text-base font-bold text-blue-800">
                      SOB-{customer.id.substring(0, 6).toUpperCase()}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => {
                      navigator.clipboard.writeText(`SOB-${customer.id.substring(0, 6).toUpperCase()}`);
                      toast.success('Referral code copied to clipboard');
                    }}
                  >
                    <Share2 className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-muted-foreground">Available Credit Balance</span>
                  <span className="font-bold text-emerald-700">
                    ${customer.credit_balance ?? 0}.00 CAD
                  </span>
                </div>

                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Customer Satisfaction Score</span>
                  <span className="font-semibold text-slate-800">
                    {customer.customer_score ?? '5.0'} / 5.0 ⭐
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-600" />
                  Account Lifecycle
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-muted-foreground">Created On</span>
                  <span>{new Date(customer.created_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span>{new Date(customer.updated_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Portal Status</span>
                  <Badge variant="outline" className="text-emerald-700 border-emerald-200 text-[10px]">
                    Active Customer Portal
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Customer Form Modal */}
      <CustomerFormModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        customer={customer}
        onSuccess={() => {
          fetchCustomerData();
        }}
      />

      {/* Add Service Modal */}
      <AddCustomerServiceModal
        customer={customer}
        open={serviceModalOpen}
        onOpenChange={setServiceModalOpen}
        defaultTab={serviceModalTab}
        onSuccess={fetchCustomerData}
        initialHomeSpecs={{
          home_bedrooms: customer.home_bedrooms ?? jobs[0]?.home_bedrooms,
          home_bathrooms: customer.home_bathrooms ?? jobs[0]?.home_bathrooms,
          has_pets: Boolean(customer.pet_details || jobs[0]?.has_pets),
          access_instructions: customer.access_code || jobs[0]?.access_instructions,
        }}
      />
    </div>
  );
}
