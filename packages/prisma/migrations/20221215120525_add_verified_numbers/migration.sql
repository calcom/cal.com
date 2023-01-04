-- AlterTable
ALTER TABLE "WorkflowStep" ADD COLUMN     "numberVerificationPending" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "VerifiedNumber" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "phoneNumber" TEXT NOT NULL,

    CONSTRAINT "VerifiedNumber_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VerifiedNumber" ADD CONSTRAINT "VerifiedNumber_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
