-- AlterTable
ALTER TABLE "WorkflowReminder" ADD COLUMN     "smsCredits" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SmsCountryCredits" (
    "id" TEXT NOT NULL,
    "iso" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "credits" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SmsCountryCredits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsCreditCount" (
    "id" SERIAL NOT NULL,
    "userTeamKey" TEXT NOT NULL,
    "userId" INTEGER,
    "teamId" INTEGER NOT NULL,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "limitReachedAt" TIMESTAMP(3),
    "warningSentAt" TIMESTAMP(3),

    CONSTRAINT "SmsCreditCount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SmsCountryCredits_id_key" ON "SmsCountryCredits"("id");

-- CreateIndex
CREATE UNIQUE INDEX "SmsCreditCount_userTeamKey_key" ON "SmsCreditCount"("userTeamKey");

-- CreateIndex
CREATE UNIQUE INDEX "SmsCreditCount_userId_teamId_key" ON "SmsCreditCount"("userId", "teamId");

-- AddForeignKey
ALTER TABLE "SmsCreditCount" ADD CONSTRAINT "SmsCreditCount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsCreditCount" ADD CONSTRAINT "SmsCreditCount_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
