-- Migration to add all commercial and specialty service types to service_type enum
-- Allows creating leads, quotes, and jobs for carpet cleaning, commercial cleaning,
-- strip & wax, post-construction cleaning, junk removal, and painting.

ALTER TYPE service_type ADD VALUE IF NOT EXISTS 'carpet_clean';
ALTER TYPE service_type ADD VALUE IF NOT EXISTS 'commercial_cleaning';
ALTER TYPE service_type ADD VALUE IF NOT EXISTS 'strip_and_wax';
ALTER TYPE service_type ADD VALUE IF NOT EXISTS 'post_construction_clean';
ALTER TYPE service_type ADD VALUE IF NOT EXISTS 'junk_removal';
ALTER TYPE service_type ADD VALUE IF NOT EXISTS 'painting';

-- Ensure pricing_quotes property_type allows nulls (already nullable, ensure no strict constraints)
ALTER TABLE pricing_quotes ALTER COLUMN property_type DROP NOT NULL;
