-- Step 1: Add column as nullable
ALTER TABLE "App_RoutingForms_FormResponse" ADD COLUMN "uuid" TEXT;

-- Step 2: Populate existing rows with UUIDs
UPDATE "App_RoutingForms_FormResponse" SET "uuid" = gen_random_uuid()::text WHERE "uuid" IS NULL;

-- Step 3: Make column NOT NULL
ALTER TABLE "App_RoutingForms_FormResponse" ALTER COLUMN "uuid" SET NOT NULL;

-- Step 4: Add unique constraint
CREATE UNIQUE INDEX "App_RoutingForms_FormResponse_uuid_key" ON "App_RoutingForms_FormResponse"("uuid");
