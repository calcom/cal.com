-- DropForeignKey
ALTER TABLE "DestinationCalendar" DROP CONSTRAINT IF EXISTS "DestinationCalendar_domainWideDelegationCredentialId_fkey";

-- DropForeignKey
ALTER TABLE "BookingReference" DROP CONSTRAINT IF EXISTS "BookingReference_domainWideDelegationCredentialId_fkey";

-- DropForeignKey
ALTER TABLE "SelectedCalendar" DROP CONSTRAINT IF EXISTS "SelectedCalendar_domainWideDelegationCredentialId_fkey";

-- DropForeignKey
ALTER TABLE "DomainWideDelegation" DROP CONSTRAINT IF EXISTS "DomainWideDelegation_workspacePlatformId_fkey";

-- DropForeignKey
ALTER TABLE "DomainWideDelegation" DROP CONSTRAINT IF EXISTS "DomainWideDelegation_organizationId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "DomainWideDelegation_organizationId_domain_key";

-- AlterTable
ALTER TABLE "BookingReference" DROP COLUMN IF EXISTS "domainWideDelegationCredentialId";

-- AlterTable
ALTER TABLE "DestinationCalendar" DROP COLUMN IF EXISTS "domainWideDelegationCredentialId";

-- AlterTable
ALTER TABLE "SelectedCalendar" DROP COLUMN IF EXISTS "domainWideDelegationCredentialId";

-- DropTable
DROP TABLE IF EXISTS "DomainWideDelegation";
