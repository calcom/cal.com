-- CreateEnum
CREATE TYPE "public"."CreditTransferReason" AS ENUM ('TEAM_UPGRADED_TO_ORG');

-- CreateTable
CREATE TABLE "public"."CreditTransferLog" (
    "id" TEXT NOT NULL,
    "fromCreditBalanceId" TEXT NOT NULL,
    "toCreditBalanceId" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "reason" "public"."CreditTransferReason" NOT NULL,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditTransferLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."CreditTransferLog" ADD CONSTRAINT "CreditTransferLog_fromCreditBalanceId_fkey" FOREIGN KEY ("fromCreditBalanceId") REFERENCES "public"."CreditBalance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CreditTransferLog" ADD CONSTRAINT "CreditTransferLog_toCreditBalanceId_fkey" FOREIGN KEY ("toCreditBalanceId") REFERENCES "public"."CreditBalance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CreditTransferLog" ADD CONSTRAINT "CreditTransferLog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
