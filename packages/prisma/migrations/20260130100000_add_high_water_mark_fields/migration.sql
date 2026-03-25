-- AlterTable: Add high water mark tracking fields for monthly billing
ALTER TABLE "TeamBilling" ADD COLUMN "highWaterMark" INTEGER,
ADD COLUMN "highWaterMarkPeriodStart" TIMESTAMP(3);

-- AlterTable: Add high water mark tracking fields for monthly billing (organizations)
ALTER TABLE "OrganizationBilling" ADD COLUMN "highWaterMark" INTEGER,
ADD COLUMN "highWaterMarkPeriodStart" TIMESTAMP(3);

INSERT INTO "public"."Feature" ("slug", "enabled", "description", "type", "stale", "lastUsedAt", "createdAt", "updatedAt")
VALUES ('hwm-seating', false, 'High water mark seating for monthly billing - charges for peak seats used during billing period', 'RELEASE', false, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
