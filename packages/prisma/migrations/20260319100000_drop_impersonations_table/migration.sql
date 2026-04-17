-- DropTable
DROP TABLE IF EXISTS "Impersonations";

-- AlterTable: Remove disableImpersonation from User
ALTER TABLE "users" DROP COLUMN IF EXISTS "disableImpersonation";

-- AlterTable: Remove disableImpersonation from Membership
ALTER TABLE "Membership" DROP COLUMN IF EXISTS "disableImpersonation";
