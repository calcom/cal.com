-- AlterTable
ALTER TABLE "DelegationCredential" ADD COLUMN     "lastDisabledAt" TIMESTAMP(3),
ADD COLUMN     "lastEnabledAt" TIMESTAMP(3);
