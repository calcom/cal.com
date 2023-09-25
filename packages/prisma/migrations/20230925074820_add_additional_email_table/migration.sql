-- AlterTable
ALTER TABLE "VerificationToken" ADD COLUMN     "parentUserId" INTEGER;

-- CreateTable
CREATE TABLE "AdditionalEmail" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "parentUserId" INTEGER NOT NULL,

    CONSTRAINT "AdditionalEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdditionalEmail_email_parentUserId_key" ON "AdditionalEmail"("email", "parentUserId");

-- AddForeignKey
ALTER TABLE "AdditionalEmail" ADD CONSTRAINT "AdditionalEmail_parentUserId_fkey" FOREIGN KEY ("parentUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
