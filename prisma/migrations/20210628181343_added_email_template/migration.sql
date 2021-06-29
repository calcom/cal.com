-- CreateEnum
CREATE TYPE "EmailTemplateType" AS ENUM ('ATTENDEE', 'ORGANIZER');

-- CreateTable
CREATE TABLE "ResetPasswordRequest" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "email" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" SERIAL NOT NULL,
    "eventTypeId" INTEGER NOT NULL,
    "type" "EmailTemplateType" NOT NULL,
    "body" TEXT NOT NULL,
    "subject" TEXT NOT NULL,

    PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
