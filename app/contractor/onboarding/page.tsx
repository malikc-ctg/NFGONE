'use client';

export const dynamic = 'force-dynamic';

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import dynamic_import from 'next/dynamic';

const AddressAutofill = dynamic_import(
  () => import('@mapbox/search-js-react').then((mod) => mod.AddressAutofill),
  { ssr: false }
);

export default function OnboardingPage() {
  const router = useRouter();
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  
  // Editable form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [primaryZoneId, setPrimaryZoneId] = useState('');
  const [hqAddress, setHqAddress] = useState('');
  
  // Additional Form state
  const [additionalZones, setAdditionalZones] = useState<string[]>([]);
  const [insurance, setInsurance] = useState({ provider: '', policy_number: '', coverage_amount: '', file_url: '' });
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const loadContractorData = async () => {
    try {
      // Use the secure me endpoint to get the contractor details
      const meRes = await fetch('/api/contractors/me');
      if (meRes.ok) {
        const data = await meRes.json();
        if (data.status === 'active') {
          router.push('/contractor');
          return;
        }
        setContractor(data);
        setFullName(data.full_name || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setPrimaryZoneId(data.zone_id || '');
        setAdditionalZones(data.selected_zone_ids || []);
        
        const existingNotes = data.notes ? JSON.parse(data.notes) : {};
        setHqAddress(existingNotes.hq_address || '');
      } else {
        // Fallback: If /me fails (due to status or whatever), fetch directly
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.user) {
          const { data: contractorData, error } = await supabase
            .from('contractors')
            .select(`*, zone:zones!contractors_zone_id_fkey(*)`)
            .eq('profile_id', sessionData.session.user.id)
            .single();
            
          if (contractorData) {
            setContractor(contractorData);
            setFullName(contractorData.full_name || '');
            setEmail(contractorData.email || '');
            setPhone(contractorData.phone || '');
            setPrimaryZoneId(contractorData.zone_id || '');
            const existingNotes = contractorData.notes ? JSON.parse(contractorData.notes) : {};
            setHqAddress(existingNotes.hq_address || '');
          }
        }
      }

      // Get all zones (table is publicly readable or uses session token)
      const { data: allZones } = await supabase.from('zones').select('*').order('name');
      setZones(allZones || []);
    } catch (e) {
      console.error("Error loading contractor data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isHandled = false;

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user && !isHandled) {
        isHandled = true;
        await loadContractorData();
      } else if (event === 'INITIAL_SESSION' && !session) {
        const hasAuthTokens = window.location.hash.includes('access_token') || 
                              window.location.search.includes('token_hash') ||
                              window.location.search.includes('code');
        const hash = window.location.hash;
        const searchParams = new URLSearchParams(window.location.search);
        const token_hash = searchParams.get('token_hash');
        const type = searchParams.get('type') as any;

        if (hash && hash.includes('access_token=')) {
          // Implicit grant (hash fragment)
          const hashParams = new URLSearchParams(hash.substring(1));
          const access_token = hashParams.get('access_token');
          const refresh_token = hashParams.get('refresh_token');
          
          if (access_token && refresh_token) {
            supabase.auth.setSession({ access_token, refresh_token }).then(({ data, error }) => {
              if (error || !data.session) {
                toast.error('Invalid or expired invite link. Please request a new one.');
                router.push('/contractor/login');
              } else {
                window.history.replaceState({}, document.title, window.location.pathname);
              }
            });
          }
        } else if (token_hash && type) {
          // PKCE grant (search query)
          supabase.auth.verifyOtp({ token_hash, type }).then(({ error }) => {
            if (error) {
              toast.error('Invalid or expired invite link. Please request a new one.');
              router.push('/contractor/login');
            } else {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          });
        } else if (!hasAuthTokens) {
          router.push('/contractor/login');
        }
      }
    });
    
    // Fallback timer: If stuck in loading, unlock screen and attempt fetch
    const fallbackTimer = setTimeout(async () => {
      if (!isHandled) {
        isHandled = true;
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          await loadContractorData();
        } else {
          setLoading(false);
        }
      }
    }, 5000);
    
    return () => {
      clearTimeout(fallbackTimer);
      authListener.subscription.unsubscribe();
    };
  }, [router, supabase]);

  const toggleZone = (zoneId: string) => {
    setAdditionalZones(prev => 
      prev.includes(zoneId) ? prev.filter(id => id !== zoneId) : [...prev, zoneId]
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setInsuranceFile(e.target.files[0]);
    }
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

    setSubmitting(true);
    try {
      // 1. Update password
      const { error: passwordError } = await supabase.auth.updateUser({ password });
      if (passwordError) throw passwordError;

      // 2. Upload Insurance File if provided
      let finalFileUrl = '';
      if (insuranceFile && contractor) {
        const fileExt = insuranceFile.name.split('.').pop();
        const fileName = `${contractor.id}-${Date.now()}.${fileExt}`;
        
        // Ensure bucket exists, if not, skip gracefully
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('contractor_documents')
          .upload(fileName, insuranceFile);
          
        if (!uploadError && uploadData) {
          finalFileUrl = uploadData.path;
        } else {
          console.warn("Could not upload file to storage, continuing anyway.", uploadError);
        }
      }

      // 3. Add extra zones
      if (additionalZones.length > 0) {
        await supabase.from('contractor_zones').delete().eq('contractor_id', contractor?.id);
        const zoneInserts = additionalZones.map(zId => ({
          contractor_id: contractor?.id,
          zone_id: zId
        }));
        await supabase.from('contractor_zones').insert(zoneInserts);
      }

      // 4. Update contractor status, basic info, and JSON notes
      const existingNotes = contractor?.notes ? JSON.parse(contractor.notes) : {};
      const updatedNotes = {
          ...existingNotes,
          hq_address: hqAddress,
          insurance_details: {
            ...insurance,
            file_url: finalFileUrl || insurance.file_url
          }
      };

      const { error: updateError } = await supabase
        .from('contractors')
        .update({ 
            full_name: fullName,
            email: email,
            phone: phone,
            zone_id: primaryZoneId || null,
            status: 'active',
            notes: JSON.stringify(updatedNotes)
        })
        .eq('id', contractor?.id);
        
      if (updateError) throw updateError;

      // Also update the profile email and full name to stay in sync
      await supabase.from('profiles').update({ full_name: fullName, phone: phone }).eq('id', contractor?.profile_id);

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
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 py-12">
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
            
            {/* Account Info Section */}
            <div className="p-6 bg-slate-50 border-b space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Account Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Full Name</Label>
                  <Input 
                    value={fullName} 
                    onChange={e => setFullName(e.target.value)} 
                    required
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input 
                    type="email"
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    required
                  />
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <Input 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    required
                  />
                </div>
                <div>
                  <Label>Primary Operating Zone</Label>
                  <Select value={primaryZoneId} onValueChange={setPrimaryZoneId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select primary zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {zones.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id}>
                          {zone.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>HQ Address (Home or Office)</Label>
                  {isMounted ? (
                    <AddressAutofill accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN!}>
                      <Input 
                        placeholder="e.g. 123 Main St, Toronto, ON"
                        value={hqAddress} 
                        onChange={e => setHqAddress(e.target.value)} 
                        autoComplete="address-line1"
                        required
                      />
                    </AddressAutofill>
                  ) : (
                    <Input 
                      placeholder="e.g. 123 Main St, Toronto, ON"
                      value={hqAddress} 
                      onChange={e => setHqAddress(e.target.value)} 
                      required
                    />
                  )}
                  <p className="text-xs text-muted-foreground mt-1">This address is used to calculate travel routes and dispatch jobs near you.</p>
                </div>
              </div>
            </div>

            {/* Additional Zones */}
            <div className="p-6 border-b space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Additional Zones</h2>
              <p className="text-sm text-muted-foreground">Select any other zones where you are willing to accept jobs.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {zones.filter(z => z.id !== primaryZoneId).map((zone) => (
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
              <p className="text-sm text-muted-foreground">Please provide your liability insurance information and upload your slip.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Insurance Provider</Label>
                  <Input 
                    placeholder="e.g. Intact Insurance" 
                    value={insurance.provider}
                    onChange={e => setInsurance({...insurance, provider: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Policy Number</Label>
                  <Input 
                    placeholder="e.g. POL-123456789" 
                    value={insurance.policy_number}
                    onChange={e => setInsurance({...insurance, policy_number: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Coverage Amount</Label>
                  <Input 
                    placeholder="e.g. $2,000,000" 
                    value={insurance.coverage_amount}
                    onChange={e => setInsurance({...insurance, coverage_amount: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Upload Insurance Slip</Label>
                  <Input 
                    type="file" 
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="cursor-pointer"
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
