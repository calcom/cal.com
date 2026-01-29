-- Enable the onboarding-v3 feature flag
UPDATE "Feature"
SET enabled = true
WHERE slug = 'onboarding-v3';
