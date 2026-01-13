-- CreateEnum
CREATE TYPE "public"."AppearanceCascadePriority" AS ENUM ('ORGANIZATION_FIRST', 'USER_FIRST');

-- AlterTable
ALTER TABLE "public"."OrganizationSettings" ADD COLUMN     "appearanceCascadePriority" "public"."AppearanceCascadePriority" NOT NULL DEFAULT 'ORGANIZATION_FIRST';
