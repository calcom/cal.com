-- Step 1: Find your team ID (run this first to get your team ID)
SELECT t.id as team_id, t.name as team_name, t."isPlatform"
FROM "Team" t
JOIN "Membership" m ON t.id = m."teamId"
WHERE m.role IN ('ADMIN', 'OWNER');

-- Step 2: Enable platform for your team (replace 1 with your actual team ID from step 1)
UPDATE "Team" SET "isPlatform" = true WHERE id = 1;

-- Step 3: Create platform billing record (replace 1 with your team ID)
INSERT INTO "PlatformBilling" (
    "id",
    "customerId",
    "subscriptionId",
    "plan"
) VALUES (
    1,  -- Replace with your team ID
    'cus_dev_dummy',
    'sub_dev_dummy',
    'starter'
) ON CONFLICT (id) DO UPDATE SET
    "customerId" = 'cus_dev_dummy',
    "subscriptionId" = 'sub_dev_dummy',
    "plan" = 'starter';

-- Step 4: Ensure license key is set
INSERT INTO "Deployment" (id, "licenseKey")
VALUES (1, '59c0bed7-8b21-4280-8514-e022fbfc24c7')
ON CONFLICT (id) DO UPDATE SET
    "licenseKey" = '59c0bed7-8b21-4280-8514-e022fbfc24c7';
