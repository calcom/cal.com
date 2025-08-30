ALTER TABLE "Team" ALTER COLUMN "brandColor" DROP NOT NULL,
ALTER COLUMN "brandColor" DROP DEFAULT,
ALTER COLUMN "darkBrandColor" DROP NOT NULL,
ALTER COLUMN "darkBrandColor" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "brandColor" DROP NOT NULL,
ALTER COLUMN "brandColor" DROP DEFAULT,
ALTER COLUMN "darkBrandColor" DROP NOT NULL,
ALTER COLUMN "darkBrandColor" DROP DEFAULT;

UPDATE "Team" SET "brandColor" = NULL WHERE "brandColor" = '#292929';
UPDATE "Team" SET "darkBrandColor" = NULL WHERE "darkBrandColor" = '#fafafa';

UPDATE "users" SET "brandColor" = NULL WHERE "brandColor" = '#292929';
UPDATE "users" SET "darkBrandColor" = NULL WHERE "darkBrandColor" = '#fafafa';

