import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = [
      'fullName', 'email', 'phone', 'applicantType', 
      'yearsExperience', 'primaryCity', 'serviceAreas',
      'hasLiabilityInsurance', 'hasRegisteredBusiness', 
      'legallyAllowedToWorkOntario', 'hasGoogleBusinessProfile',
      'businessDescription'
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    if (!body.consentInformationAccurate || !body.consentApplicationNotGuaranteed || !body.consentContact || !body.agreesToVerification) {
      return NextResponse.json({ error: 'All consent and verification checkboxes must be checked' }, { status: 400 });
    }

    const supabase = await createServiceClient();

    const { error } = await supabase
      .from('contractor_applications')
      .insert({
        full_name: body.fullName,
        business_name: body.businessName || null,
        email: body.email,
        phone: body.phone,
        applicant_type: body.applicantType,
        years_experience: body.yearsExperience,
        team_size: body.teamSize || null,
        services_offered: body.servicesOffered || [],
        primary_city: body.primaryCity,
        service_areas: body.serviceAreas,
        travel_radius: body.travelRadius || null,
        weekdays_available: body.weekdaysAvailable || [],
        preferred_job_types: body.preferredJobTypes || [],
        has_liability_insurance: body.hasLiabilityInsurance,
        insurance_provider: body.insuranceProvider || null,
        has_registered_business: body.hasRegisteredBusiness,
        business_registration_number: body.businessRegistrationNumber || null,
        legally_allowed_to_work_ontario: body.legallyAllowedToWorkOntario,
        agrees_to_verification: body.agreesToVerification,
        has_google_business_profile: body.hasGoogleBusinessProfile,
        google_business_profile_link: body.googleBusinessProfileLink || null,
        google_business_profile_business_name: body.googleBusinessProfileBusinessName || null,
        google_rating: body.googleRating || null,
        google_review_count: body.googleReviewCount ? parseInt(body.googleReviewCount, 10) : null,
        google_business_profile_verified: body.googleBusinessProfileVerified || null,
        website_url: body.websiteUrl || null,
        instagram_url: body.instagramUrl || null,
        facebook_url: body.facebookUrl || null,
        other_profile_url: body.otherProfileUrl || null,
        business_description: body.businessDescription,
        reason_for_joining: body.reasonForJoining || null,
        consent_information_accurate: body.consentInformationAccurate,
        consent_application_not_guaranteed: body.consentApplicationNotGuaranteed,
        consent_contact: body.consentContact,
        status: 'New'
      });

    if (error) {
      console.error('Error inserting contractor application:', error);
      return NextResponse.json({ error: 'Database error while saving application' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    console.error('Error in contractor application submission:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
