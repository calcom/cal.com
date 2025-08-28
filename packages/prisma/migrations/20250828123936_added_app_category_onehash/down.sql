-- AlterEnum
BEGIN;
CREATE TYPE "AppCategories_new" AS ENUM ('calendar', 'messaging', 'other', 'payment', 'video', 'web3', 'automation', 'analytics', 'conferencing', 'crm');
ALTER TABLE "App" ALTER COLUMN "categories" TYPE "AppCategories_new"[] USING ("categories"::text::"AppCategories_new"[]);
ALTER TYPE "AppCategories" RENAME TO "AppCategories_old";
ALTER TYPE "AppCategories_new" RENAME TO "AppCategories";
DROP TYPE "AppCategories_old";
COMMIT;

