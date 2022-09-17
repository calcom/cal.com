-- AlterTable
-- Every user is PRO now, later this column will be deprecated.
UPDATE "users" SET "plan" = 'PRO';
ALTER TABLE "users" ALTER COLUMN "plan" SET DEFAULT 'PRO';
