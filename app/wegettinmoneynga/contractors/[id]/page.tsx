'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Star, ShieldCheck, ShieldX, ShieldAlert,
  FileText, ExternalLink, CheckCircle2, XCircle, Clock
} from 'lucide-react';
import type { Contractor } from '@/types';
import Link from 'next/link';
import { toast } from 'sonner';

interface InsuranceDetails {
  provider?: string;
  policy_number?: string;
  file_url?: string;
  status?: 'verified' | 'rejected' | 'pending';
  uploaded_at?: string;
  verified_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
}

export default function ContractorDetailPage() {
  const params = useParams();
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [insurance, setInsurance] = useState<InsuranceDetails | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  async function fetchContractor() {
    const res = await fetch('/api/contractors');
    const data = await res.json();
    const found = (Array.isArray(data) ? data : []).find((c: Contractor) => c.id === params.id);
    if (found) {
      setContractor(found);
      try {
        const notes = found.notes ? JSON.parse(found.notes) : {};
        setInsurance(notes.insurance_details ?? null);
      } catch {
        setInsurance(null);
      }
    }
  }

  useEffect(() => { fetchContractor(); }, [params.id]);

  async function handleVerify() {
    setIsVerifying(true);
    try {
      const res = await fetch(`/api/contractors/${params.id}/verify-insurance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify' }),
      });
      if (!res.ok) throw new Error('Failed to verify');
      toast.success('Insurance verified! Contractor can now accept jobs.');
      fetchContractor();
    } catch {
      toast.error('Failed to verify insurance');
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleReject() {
    if (!rejectionNote.trim()) {
      toast.error('Please enter a reason for rejection');
      return;
    }
    setIsVerifying(true);
    try {
      const res = await fetch(`/api/contractors/${params.id}/verify-insurance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', admin_notes: rejectionNote }),
      });
      if (!res.ok) throw new Error('Failed to reject');
      toast.success('Insurance rejected. Contractor has been notified to re-upload.');
      setShowRejectInput(false);
      setRejectionNote('');
      fetchContractor();
    } catch {
      toast.error('Failed to reject insurance');
    } finally {
      setIsVerifying(false);
    }
  }

  if (!contractor) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const insuranceStatus = insurance?.status;
  const hasFile = !!insurance?.file_url;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/wegettinmoneynga/contractors"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Back</Button></Link>
        <div>
          <h1 className="text-2xl font-bold">{contractor.full_name}</h1>
          <div className="flex gap-2 mt-1">
            <Badge variant="outline" className="capitalize">{contractor.tier}</Badge>
            <Badge variant="outline" className={`capitalize ${contractor.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{contractor.status}</Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact */}
        <Card>
          <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{contractor.email}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{contractor.phone}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Primary Zone</span><span>{(contractor as any).zone?.name ?? '—'}</span></div>
            <div className="space-y-2">
              <span className="text-muted-foreground block">Additional Zones</span>
              <div className="flex flex-wrap gap-1">
                {(contractor as any).contractor_zones?.length > 0 ? (
                  (contractor as any).contractor_zones.map((cz: any) => (
                    <Badge key={cz.zone.id} variant="secondary" className="text-[10px]">{cz.zone.name}</Badge>
                  ))
                ) : (
                  <span className="text-xs italic text-muted-foreground">No additional zones</span>
                )}
              </div>
            </div>
            <div className="flex justify-between pt-2 border-t"><span className="text-muted-foreground">Vehicle</span><span>{contractor.has_vehicle ? 'Yes' : 'No'}</span></div>
          </CardContent>
        </Card>

        {/* Performance */}
        <Card>
          <CardHeader><CardTitle>Performance</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center"><span className="text-muted-foreground">Score</span><span className="flex items-center gap-1"><Star className="h-4 w-4 text-amber-500" /><span className="font-bold text-lg">{contractor.score}</span>/5.00</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Payout Rate</span><span>{(contractor.payout_rate * 100).toFixed(0)}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Max Jobs/Day</span><span>{contractor.max_jobs_per_day}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Own Supplies</span><span>{contractor.brings_own_supplies ? 'Yes' : 'No'}</span></div>
          </CardContent>
        </Card>

        {/* Compliance */}
        <Card>
          <CardHeader><CardTitle>Compliance</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Background Check</span><span>{contractor.background_check_cleared ? '✓ Cleared' : '✗ Pending'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Insurance</span><span>{contractor.insurance_on_file ? '✓ On File' : '✗ Missing'}</span></div>
          </CardContent>
        </Card>
      </div>

      {/* ── Insurance Verification Card ── */}
      <Card className={`border-2 ${
        insuranceStatus === 'verified'
          ? 'border-green-200 bg-green-50/40 dark:bg-green-950/20'
          : insuranceStatus === 'rejected'
          ? 'border-red-200 bg-red-50/40 dark:bg-red-950/20'
          : hasFile
          ? 'border-amber-200 bg-amber-50/40 dark:bg-amber-950/20'
          : 'border-dashed border-muted-foreground/30'
      }`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {insuranceStatus === 'verified' ? (
                <><ShieldCheck className="h-5 w-5 text-green-600" /> Insurance Verification</>
              ) : insuranceStatus === 'rejected' ? (
                <><ShieldX className="h-5 w-5 text-red-600" /> Insurance Verification</>
              ) : hasFile ? (
                <><ShieldAlert className="h-5 w-5 text-amber-600" /> Insurance Verification</>
              ) : (
                <><ShieldAlert className="h-5 w-5 text-muted-foreground" /> Insurance Verification</>
              )}
            </CardTitle>
            <div>
              {insuranceStatus === 'verified' && (
                <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Verified
                </Badge>
              )}
              {insuranceStatus === 'rejected' && (
                <Badge className="bg-red-100 text-red-700 border-red-200 flex items-center gap-1">
                  <XCircle className="h-3 w-3" /> Rejected
                </Badge>
              )}
              {!insuranceStatus && hasFile && (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Pending Review
                </Badge>
              )}
              {!hasFile && !insuranceStatus && (
                <Badge variant="outline" className="text-muted-foreground">No Document</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Insurance details from onboarding */}
          {(insurance?.provider || insurance?.policy_number) && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              {insurance.provider && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Provider</p>
                  <p className="font-medium">{insurance.provider}</p>
                </div>
              )}
              {insurance.policy_number && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Policy Number</p>
                  <p className="font-medium">{insurance.policy_number}</p>
                </div>
              )}
            </div>
          )}

          {/* Uploaded document */}
          {insurance?.file_url ? (
            <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Insurance Document</p>
                <p className="text-xs text-muted-foreground">
                  {insurance.uploaded_at
                    ? `Uploaded ${new Date(insurance.uploaded_at).toLocaleDateString()}`
                    : 'Uploaded'}
                </p>
              </div>
              <a
                href={insurance.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
              >
                View <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No insurance document uploaded yet</p>
              <p className="text-xs mt-1">The contractor will be prompted to upload from their dashboard.</p>
            </div>
          )}

          {/* Rejection reason */}
          {insuranceStatus === 'rejected' && insurance?.rejection_reason && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
              <p className="text-xs font-medium text-red-700 mb-1">Rejection Reason</p>
              <p className="text-red-600">{insurance.rejection_reason}</p>
            </div>
          )}

          {/* Admin verified info */}
          {insuranceStatus === 'verified' && insurance?.verified_at && (
            <p className="text-xs text-green-700">
              ✓ Verified on {new Date(insurance.verified_at).toLocaleDateString()}
            </p>
          )}

          {/* Action buttons — only show when file exists and not yet verified */}
          {hasFile && insuranceStatus !== 'verified' && (
            <div className="space-y-3 pt-2 border-t border-border">
              {!showRejectInput ? (
                <div className="flex gap-3">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleVerify}
                    disabled={isVerifying}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {isVerifying ? 'Verifying...' : 'Verify Insurance'}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setShowRejectInput(true)}
                    disabled={isVerifying}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground font-medium">Rejection Reason *</label>
                  <textarea
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none"
                    rows={2}
                    placeholder="e.g. Policy expired, wrong document type, illegible..."
                    value={rejectionNote}
                    onChange={e => setRejectionNote(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={handleReject}
                      disabled={isVerifying}
                    >
                      {isVerifying ? 'Rejecting...' : 'Confirm Rejection'}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => { setShowRejectInput(false); setRejectionNote(''); }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Re-verify option if previously rejected but new file uploaded */}
          {hasFile && insuranceStatus === 'verified' && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border">
              <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
              This contractor is cleared to accept jobs.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
