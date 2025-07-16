-- DropIndex
DROP INDEX IF EXISTS "App_RoutingForms_FormResponse_uuid_key";

-- DropIndex
DROP INDEX IF EXISTS "RoutingFormResponseDenormalized_uuid_key";

-- AlterTable
ALTER TABLE "App_RoutingForms_FormResponse" ALTER COLUMN "uuid" DROP NOT NULL;

-- AlterTable
ALTER TABLE "RoutingFormResponseDenormalized" ALTER COLUMN "uuid" DROP NOT NULL;
