-- Migration: 005 Multi-Zone System
-- Add areas support and many-to-many relationship for contractors

-- 1. Add areas column to zones
ALTER TABLE zones ADD COLUMN IF NOT EXISTS areas TEXT[] DEFAULT '{}';

-- 2. Create contractor_zones table
CREATE TABLE IF NOT EXISTS contractor_zones (
    contractor_id UUID REFERENCES contractors(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES zones(id) ON DELETE CASCADE,
    PRIMARY KEY (contractor_id, zone_id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS on contractor_zones
ALTER TABLE contractor_zones ENABLE ROW LEVEL SECURITY;

-- Policies for contractor_zones
DROP POLICY IF EXISTS "Contractors can view their own zone selections" ON contractor_zones;
CREATE POLICY "Contractors can view their own zone selections"
    ON contractor_zones FOR SELECT
    USING (auth.uid() IN (SELECT profile_id FROM contractors WHERE id = contractor_id));

DROP POLICY IF EXISTS "Contractors can manage their own zone selections" ON contractor_zones;
CREATE POLICY "Contractors can manage their own zone selections"
    ON contractor_zones FOR ALL
    USING (auth.uid() IN (SELECT profile_id FROM contractors WHERE id = contractor_id));

DROP POLICY IF EXISTS "Admins have full access to contractor_zones" ON contractor_zones;
CREATE POLICY "Admins have full access to contractor_zones"
    ON contractor_zones FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 4. Seed the GTA Zones
-- First, clear existing zones to avoid duplicates during this major update (Optional, but cleaner for seeding)
-- DELETE FROM zones; 

INSERT INTO zones (name, city, areas) VALUES
('Downtown Toronto', 'Toronto', ARRAY['Financial District', 'CityPlace', 'Liberty Village', 'King West', 'Queen West', 'Entertainment District', 'Harbourfront', 'Distillery District']),
('Midtown Toronto', 'Toronto', ARRAY['Yonge & Eglinton', 'Davisville', 'Forest Hill', 'Leaside', 'Lawrence Park', 'Rosedale', 'Summerhill']),
('North York', 'Toronto', ARRAY['Willowdale', 'Bayview Village', 'Don Mills', 'York Mills', 'Bathurst Manor', 'Downsview']),
('Etobicoke', 'Toronto', ARRAY['Mimico', 'The Kingsway', 'Islington', 'Alderwood', 'Humber Bay', 'Rexdale South']),
('Scarborough', 'Toronto', ARRAY['Guildwood', 'Agincourt', 'Scarborough Town Centre', 'Rouge', 'Birch Cliff']),
('Mississauga South', 'Mississauga', ARRAY['Port Credit', 'Clarkson', 'Lorne Park', 'Cooksville']),
('Mississauga North', 'Mississauga', ARRAY['Erin Mills', 'Meadowvale', 'Streetsville', 'Heartland']),
('Brampton', 'Brampton', ARRAY['Bramalea', 'Mount Pleasant', 'Springdale', 'Credit Valley']),
('Oakville', 'Oakville', ARRAY['Glen Abbey', 'Bronte', 'River Oaks', 'Old Oakville']),
('Burlington', 'Burlington', ARRAY['Aldershot', 'Millcroft', 'Roseland']),
('Halton Region (Milton / Halton Hills)', 'Milton', ARRAY['Milton', 'Campbellville', 'Georgetown', 'Acton']),
('Vaughan', 'Vaughan', ARRAY['Woodbridge', 'Kleinburg', 'Maple', 'Thornhill Vaughan']),
('Richmond Hill', 'Richmond Hill', ARRAY['Oak Ridges', 'Jefferson', 'Bayview Hill']),
('Markham', 'Markham', ARRAY['Unionville', 'Cornell', 'Angus Glen', 'Wismer']),
('Aurora / Newmarket', 'Aurora', ARRAY['Aurora Heights', 'Stonehaven', 'Woodland Hill']),
('Pickering / Ajax', 'Pickering', ARRAY['Rouge Park Border', 'Pickering Village', 'Duffins Bay']),
('Whitby / Oshawa', 'Whitby', ARRAY['Brooklin', 'Downtown Whitby', 'Taunton', 'North Oshawa', 'Windfields'])
ON CONFLICT (id) DO NOTHING; -- Assuming you might have existing IDs, but for new installs this is fine.
-- Better yet, if names are unique:
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_zones_name ON zones(name);
-- INSERT INTO zones (name, city, areas) ... ON CONFLICT (name) DO UPDATE SET areas = EXCLUDED.areas, city = EXCLUDED.city;
