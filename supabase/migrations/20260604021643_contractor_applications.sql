CREATE TABLE IF NOT EXISTS contractor_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  business_name TEXT,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  applicant_type TEXT NOT NULL,
  years_experience TEXT NOT NULL,
  team_size TEXT,
  services_offered JSONB NOT NULL DEFAULT '[]',
  primary_city TEXT NOT NULL,
  service_areas TEXT NOT NULL,
  travel_radius TEXT,
  weekdays_available JSONB NOT NULL DEFAULT '[]',
  preferred_job_types JSONB NOT NULL DEFAULT '[]',
  has_liability_insurance TEXT NOT NULL,
  insurance_provider TEXT,
  has_registered_business TEXT NOT NULL,
  business_registration_number TEXT,
  legally_allowed_to_work_ontario TEXT NOT NULL,
  agrees_to_verification BOOLEAN NOT NULL DEFAULT FALSE,
  has_google_business_profile TEXT NOT NULL,
  google_business_profile_link TEXT,
  google_business_profile_business_name TEXT,
  google_rating TEXT,
  google_review_count INTEGER,
  google_business_profile_verified TEXT,
  website_url TEXT,
  instagram_url TEXT,
  facebook_url TEXT,
  other_profile_url TEXT,
  business_description TEXT NOT NULL,
  reason_for_joining TEXT,
  consent_information_accurate BOOLEAN NOT NULL DEFAULT FALSE,
  consent_application_not_guaranteed BOOLEAN NOT NULL DEFAULT FALSE,
  consent_contact BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT DEFAULT 'New',
  internal_notes TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE contractor_applications ENABLE ROW LEVEL SECURITY;

-- Public can insert
CREATE POLICY "Public can insert applications" ON contractor_applications FOR INSERT WITH CHECK (true);

-- Only admins can read/update
CREATE POLICY "Admins can view applications" ON contractor_applications FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can update applications" ON contractor_applications FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);


