-- CreateEnum
CREATE TYPE "CreditType" AS ENUM ('MONTHLY', 'ADDITIONAL');

-- CreateTable
CREATE TABLE "CreditBalance" (
    "id" TEXT NOT NULL,
    "teamId" INTEGER,
    "userId" INTEGER,
    "additionalCredits" INTEGER NOT NULL DEFAULT 0,
    "limitReachedAt" TIMESTAMP(3),
    "warningSentAt" TIMESTAMP(3),

    CONSTRAINT "CreditBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditExpenseLog" (
    "id" TEXT NOT NULL,
    "creditBalanceId" TEXT NOT NULL,
    "bookingUid" TEXT,
    "credits" INTEGER,
    "creditType" "CreditType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "smsSid" TEXT,

    CONSTRAINT "CreditExpenseLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreditBalance_teamId_key" ON "CreditBalance"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditBalance_userId_key" ON "CreditBalance"("userId");

-- AddForeignKey
ALTER TABLE "CreditBalance" ADD CONSTRAINT "CreditBalance_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditBalance" ADD CONSTRAINT "CreditBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditExpenseLog" ADD CONSTRAINT "CreditExpenseLog_creditBalanceId_fkey" FOREIGN KEY ("creditBalanceId") REFERENCES "CreditBalance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditExpenseLog" ADD CONSTRAINT "CreditExpenseLog_bookingUid_fkey" FOREIGN KEY ("bookingUid") REFERENCES "Booking"("uid") ON DELETE CASCADE ON UPDATE CASCADE;
