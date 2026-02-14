-- CreateTable
CREATE TABLE "OutOfOfficeCustomReason" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "emoji" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutOfOfficeCustomReason_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "OutOfOfficeEntry" ADD COLUMN "customReasonId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "OutOfOfficeCustomReason_userId_reason_key" ON "OutOfOfficeCustomReason"("userId", "reason");

-- CreateIndex
CREATE INDEX "OutOfOfficeCustomReason_userId_idx" ON "OutOfOfficeCustomReason"("userId");

-- CreateIndex
CREATE INDEX "OutOfOfficeEntry_customReasonId_idx" ON "OutOfOfficeEntry"("customReasonId");

-- AddForeignKey
ALTER TABLE "OutOfOfficeCustomReason" ADD CONSTRAINT "OutOfOfficeCustomReason_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutOfOfficeEntry" ADD CONSTRAINT "OutOfOfficeEntry_customReasonId_fkey" FOREIGN KEY ("customReasonId") REFERENCES "OutOfOfficeCustomReason"("id") ON DELETE SET NULL ON UPDATE CASCADE;
