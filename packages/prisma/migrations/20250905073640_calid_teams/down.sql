-- DropForeignKey
ALTER TABLE "Credential" DROP CONSTRAINT "Credential_calIdTeamId_fkey";

-- DropForeignKey
ALTER TABLE "ApiKey" DROP CONSTRAINT "ApiKey_calIdTeamId_fkey";

-- DropForeignKey
ALTER TABLE "App_RoutingForms_Form" DROP CONSTRAINT "App_RoutingForms_Form_calIdTeamId_fkey";

-- DropForeignKey
ALTER TABLE "AccessCode" DROP CONSTRAINT "AccessCode_calIdTeamId_fkey";

-- DropForeignKey
ALTER TABLE "Attribute" DROP CONSTRAINT "Attribute_calIdTeamId_fkey";

-- DropForeignKey
ALTER TABLE "Role" DROP CONSTRAINT "Role_calIdTeamId_fkey";

-- DropForeignKey
ALTER TABLE "CalIdTeamFeatures" DROP CONSTRAINT "CalIdTeamFeatures_calIdTeamId_fkey";

-- DropForeignKey
ALTER TABLE "CalIdTeamFeatures" DROP CONSTRAINT "CalIdTeamFeatures_featureId_fkey";

-- DropIndex
DROP INDEX "Credential_calIdTeamId_idx";

-- DropIndex
DROP INDEX "ApiKey_calIdTeamId_idx";

-- DropIndex
DROP INDEX "App_RoutingForms_Form_calIdTeamId_idx";

-- DropIndex
DROP INDEX "AccessCode_calIdTeamId_idx";

-- DropIndex
DROP INDEX "Attribute_calIdTeamId_idx";

-- DropIndex
DROP INDEX "Role_calIdTeamId_idx";

-- DropIndex
DROP INDEX "Role_name_calIdTeamId_key";

-- AlterTable
ALTER TABLE "Credential" DROP COLUMN "calIdTeamId";

-- AlterTable
ALTER TABLE "ApiKey" DROP COLUMN "calIdTeamId";

-- AlterTable
ALTER TABLE "App_RoutingForms_Form" DROP COLUMN "calIdTeamId";

-- AlterTable
ALTER TABLE "AccessCode" DROP COLUMN "calIdTeamId";

-- AlterTable
ALTER TABLE "Attribute" DROP COLUMN "calIdTeamId";

-- AlterTable
ALTER TABLE "Role" DROP COLUMN "calIdTeamId";

-- DropTable
DROP TABLE "CalIdTeamFeatures";

