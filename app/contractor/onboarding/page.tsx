'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { Contractor, Zone } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';

export default function OnboardingPage() {
  const router = useRouter();
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  
  // Form state
  const [additionalZones, setAdditionalZones] = useState<string[]>([]);
  const [insurance, setInsurance] = useState({ provider: '', policy_number: '', expiry: '' });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function loadInitialData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/contractor/login');
        return;
      }

      // Get contractor profile
      const { data: contractorData } = await supabase
        .from('contractors')
        .select(`*, zone:zones(*)`)
        .eq('profile_id', user.id)
        .single();

      if (contractorData) {
        if (contractorData.status === 'active') {
            router.push('/contractor');
            return;
        }
        setContractor(contractorData);
      }

      // Get all zones
      const res = await fetch('/api/zones');
      const allZones = await res.json();
      setZones(Array.isArray(allZones) ? allZones : []);
      
      setLoading(false);
    }
    
    loadInitialData();
  }, [router, supabase]);

  const toggleZone = (zoneId: string) => {
    setAdditionalZones(prev => 
      prev.includes(zoneId) ? prev.filter(id => id !== zoneId) : [...prev, zoneId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (!insurance.provider || !insurance.policy_number) {
      toast.error('Insurance provider and policy number are required');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Update password
      const { error: passwordError } = await supabase.auth.updateUser({ password });
      if (passwordError) throw passwordError;

      // 2. Add extra zones
      if (additionalZones.length > 0) {
        const zoneInserts = additionalZones.map(zId => ({
          contractor_id: contractor?.id,
          zone_id: zId
        }));
        await supabase.from('contractor_zones').insert(zoneInserts);
      }

      // 3. Update contractor status and save insurance details into notes for now
      // (Using notes to store stringified JSON temporarily until schema migration is run)
      const existingNotes = contractor?.notes ? JSON.parse(contractor.notes) : {};
      const updatedNotes = {
          ...existingNotes,
          insurance_details: insurance
      };

      const { error: updateError } = await supabase
        .from('contractors')
        .update({ 
            status: 'active',
            notes: JSON.stringify(updatedNotes)
        })
        .eq('id', contractor?.id);
        
      if (updateError) throw updateError;

      toast.success('Onboarding complete! Welcome to Sea of Blue.');
      router.push('/contractor');

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'An error occurred during onboarding');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-slate-50"><p>Loading...</p></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl mb-8">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-blue-600/20">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12h4l3-9 5 18 3-9h5" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">Complete Your Profile</h1>
        <p className="text-muted-foreground">Verify your details, set your password, and get started.</p>
      </div>

      <Card className="w-full max-w-2xl shadow-xl">
        <CardContent className="p-0">
          <form onSubmit={handleSubmit}>
            
            {/* Locked Info Section */}
            <div className="p-6 bg-slate-50 border-b space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Account Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Full Name</Label>
                  <Input disabled value={contractor?.full_name || ''} className="bg-slate-100 font-medium" />
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <Input disabled value={contractor?.email || ''} className="bg-slate-100 font-medium" />
                </div>
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <Input disabled value={contractor?.phone || ''} className="bg-slate-100 font-medium" />
                </div>
                <div>
                  <Label className="text-muted-foreground">Primary Operating Zone</Label>
                  <Input disabled value={(contractor as any)?.zone?.name || 'Not assigned'} className="bg-slate-100 font-medium text-blue-600" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">These details were set by the admin. Contact support if changes are needed.</p>
            </div>

            {/* Additional Zones */}
            <div className="p-6 border-b space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Additional Zones</h2>
              <p className="text-sm text-muted-foreground">Select any other zones where you are willing to accept jobs.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {zones.filter(z => z.id !== contractor?.zone_id).map((zone) => (
                  <div key={zone.id} className="flex items-center space-x-2 border rounded-md p-3 hover:bg-slate-50 transition-colors">
                    <Checkbox 
                      id={zone.id} 
                      checked={additionalZones.includes(zone.id)}
                      onCheckedChange={() => toggleZone(zone.id)}
                    />
                    <label htmlFor={zone.id} className="text-sm font-medium leading-none cursor-pointer">
                      {zone.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Insurance */}
            <div className="p-6 border-b space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Insurance Details</h2>
              <p className="text-sm text-muted-foreground">Please provide your liability insurance information.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <Label>Insurance Provider <span className="text-red-500">*</span></Label>
                  <Input 
                    required 
                    placeholder="e.g. Intact Insurance" 
                    value={insurance.provider}
                    onChange={e => setInsurance({...insurance, provider: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Expiry Date</Label>
                  <Input 
                    type="date" 
                    value={insurance.expiry}
                    onChange={e => setInsurance({...insurance, expiry: e.target.value})}
                  />
                </div>
                <div className="md:col-span-3">
                  <Label>Policy Number <span className="text-red-500">*</span></Label>
                  <Input 
                    required 
                    placeholder="e.g. POL-123456789" 
                    value={insurance.policy_number}
                    onChange={e => setInsurance({...insurance, policy_number: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Password Setup */}
            <div className="p-6 space-y-4 bg-blue-50/50">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Set Your Password</h2>
              <p className="text-sm text-muted-foreground">Create a secure password to log in to your account moving forward.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>New Password <span className="text-red-500">*</span></Label>
                  <Input 
                    type="password" 
                    required 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Confirm Password <span className="text-red-500">*</span></Label>
                  <Input 
                    type="password" 
                    required 
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="p-6 pt-0 bg-blue-50/50">
              <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={submitting}>
                {submitting ? 'Setting up your profile...' : 'Complete Onboarding & Start'}
              </Button>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}
