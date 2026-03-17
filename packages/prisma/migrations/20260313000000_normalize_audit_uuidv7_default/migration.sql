-- Change DEFAULT on audit model id columns from uuid(7) (application-layer) to uuidv7() (DB-generated).
-- This is a metadata-only change: no column type change, no row backfill required.
ALTER TABLE "WatchlistAudit" ALTER COLUMN "id" SET DEFAULT uuidv7();
ALTER TABLE "WatchlistEventAudit" ALTER COLUMN "id" SET DEFAULT uuidv7();
ALTER TABLE "AuditActor" ALTER COLUMN "id" SET DEFAULT uuidv7();
ALTER TABLE "BookingAudit" ALTER COLUMN "id" SET DEFAULT uuidv7();
