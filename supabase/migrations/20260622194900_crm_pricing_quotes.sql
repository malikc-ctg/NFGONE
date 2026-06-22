-- Add new service types to the existing ENUM
ALTER TYPE service_type ADD VALUE IF NOT EXISTS 'standard_plus_clean';
ALTER TYPE service_type ADD VALUE IF NOT EXISTS 'reset_clean';

-- Create pricing_quotes table
CREATE TABLE IF NOT EXISTS pricing_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    package_name VARCHAR NOT NULL,
    property_size VARCHAR NOT NULL,
    conditions JSONB DEFAULT '[]'::jsonb,
    modifiers JSONB DEFAULT '{}'::jsonb,
    add_ons JSONB DEFAULT '[]'::jsonb,
    calculated_price NUMERIC(10,2) NOT NULL,
    breakdown JSONB NOT NULL,
    estimated_hours NUMERIC(4,2),
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- Enable RLS
ALTER TABLE pricing_quotes ENABLE ROW LEVEL SECURITY;

-- Admins can do anything
CREATE POLICY "Admins can manage pricing quotes" ON pricing_quotes
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );
