'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, 
  ChevronRight, 
  Building2, 
  Users, 
  UserCircle,
  Briefcase,
  Clock,
  ShieldCheck,
  TrendingUp,
  MapPin,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

export default function ApplyPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: '',
    businessName: '',
    email: '',
    phone: '',
    applicantType: '',
    yearsExperience: '',
    teamSize: '',
    servicesOffered: [] as string[],
    otherService: '',
    primaryCity: '',
    serviceAreas: '',
    travelRadius: '',
    weekdaysAvailable: [] as string[],
    preferredJobTypes: [] as string[],
    hasLiabilityInsurance: '',
    insuranceProvider: '',
    hasRegisteredBusiness: '',
    businessRegistrationNumber: '',
    legallyAllowedToWorkOntario: '',
    agreesToVerification: false,
    hasGoogleBusinessProfile: '',
    googleBusinessProfileLink: '',
    googleBusinessProfileBusinessName: '',
    googleRating: '',
    googleReviewCount: '',
    googleBusinessProfileVerified: '',
    websiteUrl: '',
    instagramUrl: '',
    facebookUrl: '',
    otherProfileUrl: '',
    businessDescription: '',
    reasonForJoining: '',
    consentInformationAccurate: false,
    consentApplicationNotGuaranteed: false,
    consentContact: false,
  });

  const handleCheckboxChange = (field: 'servicesOffered' | 'weekdaysAvailable' | 'preferredJobTypes', value: string, checked: boolean) => {
    setForm(prev => ({
      ...prev,
      [field]: checked 
        ? [...prev[field], value]
        : prev[field].filter(v => v !== value)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Basic validation
    if (!form.consentInformationAccurate || !form.consentApplicationNotGuaranteed || !form.consentContact || !form.agreesToVerification) {
      setError("You must agree to all consent and verification checkboxes.");
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = { ...form };
      if (form.otherService) {
        payload.servicesOffered.push(`Other: ${form.otherService}`);
      }

      const res = await fetch('/api/contractor-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit application');
      
      setIsSuccess(true);
      // Scroll to success message
      window.scrollTo({ top: document.getElementById('application-form')?.offsetTop || 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToForm = () => {
    document.getElementById('application-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="font-rustic font-bold text-2xl tracking-tight">Sea of Blue</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/contractor/login" className="text-sm font-medium text-muted-foreground hover:text-foreground hidden sm:block">
              Contractor Login
            </Link>
            <Button onClick={scrollToForm} className="rounded-full px-6">
              Apply to Join
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">

        {/* APPLICATION FORM */}
        <section id="application-form" className="py-24 bg-slate-50 border-t border-slate-200">
          <div className="container max-w-3xl mx-auto px-4">
            
            {isSuccess ? (
              <Card className="border-green-200 bg-green-50 shadow-sm text-center py-16">
                <CardContent className="space-y-6 flex flex-col items-center">
                  <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h2 className="text-2xl font-bold text-green-900">Application Submitted</h2>
                  <p className="text-green-800 text-lg max-w-lg">
                    Application submitted. Our team will review your request and contact selected applicants for next steps.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                <div className="text-center space-y-4">
                  <h2 className="text-3xl md:text-4xl font-rustic">Apply to Join the Network</h2>
                  <p className="text-lg text-muted-foreground">Submit your information below. Our team will review your application and contact selected applicants for the next onboarding steps.</p>
                  <p className="text-sm font-medium text-amber-700 bg-amber-50 inline-block px-4 py-2 rounded-full border border-amber-200">
                    Important: Submitting an application does not guarantee approval.
                  </p>
                </div>

                <Card className="shadow-lg border-none">
                  <CardContent className="p-6 md:p-10">
                    {error && (
                      <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
                        {error}
                      </div>
                    )}
                    
                    <form onSubmit={handleSubmit} className="space-y-12">
                      {/* 1. Applicant Information */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-2 border-b pb-2 mb-6">
                          <UserCircle className="text-primary h-5 w-5" />
                          <h3 className="text-lg font-semibold">Applicant Information</h3>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label>Full Name <span className="text-red-500">*</span></Label>
                            <Input required value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} placeholder="Jane Doe" />
                          </div>
                          <div className="space-y-2">
                            <Label>Business Name (Optional)</Label>
                            <Input value={form.businessName} onChange={e => setForm({...form, businessName: e.target.value})} placeholder="Jane's Cleaning" />
                          </div>
                          <div className="space-y-2">
                            <Label>Email Address <span className="text-red-500">*</span></Label>
                            <Input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="jane@example.com" />
                          </div>
                          <div className="space-y-2">
                            <Label>Phone Number <span className="text-red-500">*</span></Label>
                            <Input type="tel" required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="416-555-0192" />
                          </div>
                        </div>
                      </div>

                      {/* 2. Business Type */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-2 border-b pb-2 mb-6">
                          <Briefcase className="text-primary h-5 w-5" />
                          <h3 className="text-lg font-semibold">Business Type</h3>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label>Applicant Type <span className="text-red-500">*</span></Label>
                            <Select required value={form.applicantType} onValueChange={v => setForm({...form, applicantType: v})}>
                              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Independent Cleaner">Independent Cleaner</SelectItem>
                                <SelectItem value="Cleaning Team">Cleaning Team</SelectItem>
                                <SelectItem value="Cleaning Company">Cleaning Company</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Years of Experience <span className="text-red-500">*</span></Label>
                            <Input required value={form.yearsExperience} onChange={e => setForm({...form, yearsExperience: e.target.value})} placeholder="e.g. 5" />
                          </div>
                          <div className="space-y-2">
                            <Label>Number of Team Members (Optional)</Label>
                            <Input type="number" value={form.teamSize} onChange={e => setForm({...form, teamSize: e.target.value})} placeholder="e.g. 3" />
                          </div>
                        </div>
                      </div>

                      {/* 3. Services Offered */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-2 border-b pb-2 mb-6">
                          <CheckCircle2 className="text-primary h-5 w-5" />
                          <h3 className="text-lg font-semibold">Services Offered</h3>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-8">
                          <div className="space-y-4">
                            <Label className="text-base text-slate-700">Residential Cleaning</Label>
                            {['Standard Cleaning', 'Deep Cleaning', 'Move-In / Move-Out Cleaning', 'Post-Construction Cleaning', 'Airbnb Turnovers'].map(service => (
                              <div key={service} className="flex items-center space-x-2">
                                <Checkbox id={service} checked={form.servicesOffered.includes(service)} onCheckedChange={(c) => handleCheckboxChange('servicesOffered', service, !!c)} />
                                <Label htmlFor={service} className="font-normal">{service}</Label>
                              </div>
                            ))}
                          </div>
                          <div className="space-y-4">
                            <Label className="text-base text-slate-700">Commercial & Specialty</Label>
                            {['Office Cleaning', 'Retail Cleaning', 'Facility Cleaning', 'Window Cleaning', 'Pressure Washing', 'Carpet Cleaning'].map(service => (
                              <div key={service} className="flex items-center space-x-2">
                                <Checkbox id={service} checked={form.servicesOffered.includes(service)} onCheckedChange={(c) => handleCheckboxChange('servicesOffered', service, !!c)} />
                                <Label htmlFor={service} className="font-normal">{service}</Label>
                              </div>
                            ))}
                            <div className="pt-2 space-y-2">
                              <Label className="font-normal text-sm">Other Service</Label>
                              <Input value={form.otherService} onChange={e => setForm({...form, otherService: e.target.value})} placeholder="Please specify" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 4. Service Area & Availability */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-2 border-b pb-2 mb-6">
                          <MapPin className="text-primary h-5 w-5" />
                          <h3 className="text-lg font-semibold">Service Area & Availability</h3>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label>Primary City <span className="text-red-500">*</span></Label>
                            <Input required value={form.primaryCity} onChange={e => setForm({...form, primaryCity: e.target.value})} placeholder="e.g. Toronto" />
                          </div>
                          <div className="space-y-2">
                            <Label>Maximum Travel Radius</Label>
                            <Select value={form.travelRadius} onValueChange={v => setForm({...form, travelRadius: v})}>
                              <SelectTrigger><SelectValue placeholder="Select radius" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="10 km">10 km</SelectItem>
                                <SelectItem value="20 km">20 km</SelectItem>
                                <SelectItem value="30 km">30 km</SelectItem>
                                <SelectItem value="50 km">50 km</SelectItem>
                                <SelectItem value="75 km">75 km</SelectItem>
                                <SelectItem value="100 km+">100 km+</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Label>Service Areas <span className="text-red-500">*</span></Label>
                            <Textarea required value={form.serviceAreas} onChange={e => setForm({...form, serviceAreas: e.target.value})} placeholder="List the cities or neighborhoods you service" />
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-6 pt-4">
                          <div className="space-y-3">
                            <Label>Weekdays Available</Label>
                            <div className="grid grid-cols-2 gap-2">
                              {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day => (
                                <div key={day} className="flex items-center space-x-2">
                                  <Checkbox id={day} checked={form.weekdaysAvailable.includes(day)} onCheckedChange={(c) => handleCheckboxChange('weekdaysAvailable', day, !!c)} />
                                  <Label htmlFor={day} className="font-normal text-sm">{day}</Label>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-3">
                            <Label>Preferred Job Types</Label>
                            <div className="space-y-2">
                              {['One-time jobs','Recurring jobs','Same-day jobs','Commercial jobs','Residential jobs'].map(type => (
                                <div key={type} className="flex items-center space-x-2">
                                  <Checkbox id={type} checked={form.preferredJobTypes.includes(type)} onCheckedChange={(c) => handleCheckboxChange('preferredJobTypes', type, !!c)} />
                                  <Label htmlFor={type} className="font-normal text-sm">{type}</Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 5. Insurance / Compliance */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-2 border-b pb-2 mb-6">
                          <ShieldCheck className="text-primary h-5 w-5" />
                          <h3 className="text-lg font-semibold">Insurance & Compliance</h3>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label>Liability Insurance? <span className="text-red-500">*</span></Label>
                            <Select required value={form.hasLiabilityInsurance} onValueChange={v => setForm({...form, hasLiabilityInsurance: v})}>
                              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Yes">Yes</SelectItem>
                                <SelectItem value="No">No</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Insurance Provider (Optional)</Label>
                            <Input value={form.insuranceProvider} onChange={e => setForm({...form, insuranceProvider: e.target.value})} placeholder="" />
                          </div>
                          <div className="space-y-2">
                            <Label>Registered Business? <span className="text-red-500">*</span></Label>
                            <Select required value={form.hasRegisteredBusiness} onValueChange={v => setForm({...form, hasRegisteredBusiness: v})}>
                              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Yes">Yes</SelectItem>
                                <SelectItem value="No">No</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Business Reg. Number (Optional)</Label>
                            <Input value={form.businessRegistrationNumber} onChange={e => setForm({...form, businessRegistrationNumber: e.target.value})} placeholder="" />
                          </div>
                          <div className="space-y-2">
                            <Label>Legally allowed to work in Ontario? <span className="text-red-500">*</span></Label>
                            <Select required value={form.legallyAllowedToWorkOntario} onValueChange={v => setForm({...form, legallyAllowedToWorkOntario: v})}>
                              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Yes">Yes</SelectItem>
                                <SelectItem value="No">No</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2 pt-6">
                            <div className="flex items-start space-x-2">
                              <Checkbox required id="verification" checked={form.agreesToVerification} onCheckedChange={(c) => setForm({...form, agreesToVerification: !!c})} />
                              <Label htmlFor="verification" className="font-normal text-sm leading-snug">I agree to complete verification (ID check, background check) if selected. <span className="text-red-500">*</span></Label>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 6. Google Business Profile Section */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-2 border-b pb-2 mb-6">
                          <Users className="text-primary h-5 w-5" />
                          <h3 className="text-lg font-semibold">Google Business Profile</h3>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-6">
                          <div className="space-y-2 sm:col-span-2">
                            <Label>Do you have a Google Business Profile? <span className="text-red-500">*</span></Label>
                            <Select required value={form.hasGoogleBusinessProfile} onValueChange={v => setForm({...form, hasGoogleBusinessProfile: v})}>
                              <SelectTrigger className="w-full sm:w-1/2"><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Yes">Yes</SelectItem>
                                <SelectItem value="No">No</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Profile Link (URL)</Label>
                            <Input type="url" value={form.googleBusinessProfileLink} onChange={e => setForm({...form, googleBusinessProfileLink: e.target.value})} placeholder="https://g.page/..." />
                          </div>
                          <div className="space-y-2">
                            <Label>Business Name on Google</Label>
                            <Input value={form.googleBusinessProfileBusinessName} onChange={e => setForm({...form, googleBusinessProfileBusinessName: e.target.value})} placeholder="" />
                          </div>
                          <div className="space-y-2">
                            <Label>Approximate Rating</Label>
                            <Select value={form.googleRating} onValueChange={v => setForm({...form, googleRating: v})}>
                              <SelectTrigger><SelectValue placeholder="Select rating" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="No reviews yet">No reviews yet</SelectItem>
                                <SelectItem value="Under 3.0">Under 3.0</SelectItem>
                                <SelectItem value="3.0 - 3.4">3.0 - 3.4</SelectItem>
                                <SelectItem value="3.5 - 3.9">3.5 - 3.9</SelectItem>
                                <SelectItem value="4.0 - 4.4">4.0 - 4.4</SelectItem>
                                <SelectItem value="4.5 - 5.0">4.5 - 5.0</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Number of Reviews</Label>
                            <Input type="number" value={form.googleReviewCount} onChange={e => setForm({...form, googleReviewCount: e.target.value})} placeholder="e.g. 15" />
                          </div>
                          <div className="space-y-2">
                            <Label>Is your profile verified?</Label>
                            <Select value={form.googleBusinessProfileVerified} onValueChange={v => setForm({...form, googleBusinessProfileVerified: v})}>
                              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Yes">Yes</SelectItem>
                                <SelectItem value="No">No</SelectItem>
                                <SelectItem value="Not Sure">Not Sure</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      {/* 7. Online Presence & Notes */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-2 border-b pb-2 mb-6">
                          <CheckCircle2 className="text-primary h-5 w-5" />
                          <h3 className="text-lg font-semibold">Online Presence & Details</h3>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label>Website URL</Label>
                            <Input type="url" value={form.websiteUrl} onChange={e => setForm({...form, websiteUrl: e.target.value})} placeholder="https://..." />
                          </div>
                          <div className="space-y-2">
                            <Label>Instagram URL</Label>
                            <Input type="url" value={form.instagramUrl} onChange={e => setForm({...form, instagramUrl: e.target.value})} placeholder="https://instagram.com/..." />
                          </div>
                          <div className="space-y-2">
                            <Label>Facebook Page URL</Label>
                            <Input type="url" value={form.facebookUrl} onChange={e => setForm({...form, facebookUrl: e.target.value})} placeholder="https://facebook.com/..." />
                          </div>
                          <div className="space-y-2">
                            <Label>Other Profile (Yelp, Houzz, etc.)</Label>
                            <Input type="url" value={form.otherProfileUrl} onChange={e => setForm({...form, otherProfileUrl: e.target.value})} placeholder="https://..." />
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Label>Briefly tell us about your cleaning business <span className="text-red-500">*</span></Label>
                            <Textarea required className="min-h-24" value={form.businessDescription} onChange={e => setForm({...form, businessDescription: e.target.value})} placeholder="Describe your services, your team, and your approach to cleaning." />
                          </div>
                          <div className="space-y-2 sm:col-span-2">
                            <Label>Why do you want to join Sea of Blue? (Optional)</Label>
                            <Textarea className="min-h-20" value={form.reasonForJoining} onChange={e => setForm({...form, reasonForJoining: e.target.value})} placeholder="" />
                          </div>
                        </div>
                      </div>

                      {/* Documents Notice */}
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm text-slate-600">
                        <strong>Document Uploads:</strong> Supporting documents (insurance, business license) may be requested during the review process.
                      </div>

                      {/* 8. Consent */}
                      <div className="space-y-4 pt-4 border-t">
                        <div className="flex items-start space-x-3">
                          <Checkbox required id="c1" checked={form.consentInformationAccurate} onCheckedChange={(c) => setForm({...form, consentInformationAccurate: !!c})} />
                          <Label htmlFor="c1" className="font-normal text-sm leading-snug">I confirm that the information submitted is accurate. <span className="text-red-500">*</span></Label>
                        </div>
                        <div className="flex items-start space-x-3">
                          <Checkbox required id="c2" checked={form.consentApplicationNotGuaranteed} onCheckedChange={(c) => setForm({...form, consentApplicationNotGuaranteed: !!c})} />
                          <Label htmlFor="c2" className="font-normal text-sm leading-snug">I understand that this is an application request and does not guarantee approval. <span className="text-red-500">*</span></Label>
                        </div>
                        <div className="flex items-start space-x-3">
                          <Checkbox required id="c3" checked={form.consentContact} onCheckedChange={(c) => setForm({...form, consentContact: !!c})} />
                          <Label htmlFor="c3" className="font-normal text-sm leading-snug">I agree that Sea of Blue may contact me regarding my application. <span className="text-red-500">*</span></Label>
                        </div>
                      </div>

                      <Button type="submit" size="lg" className="w-full text-base h-12" disabled={isSubmitting}>
                        {isSubmitting ? 'Submitting Application...' : 'Submit Application'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="container max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-center md:text-left">
          <div>
            <span className="font-rustic text-white text-2xl block mb-1">Sea of Blue</span>
            Private beta cleaning network.
          </div>
          <div>
            Ontario, Canada. <br/>
            &copy; {new Date().getFullYear()} Sea of Blue. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
