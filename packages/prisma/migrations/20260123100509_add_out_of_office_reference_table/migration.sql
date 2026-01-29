-- AlterTable
ALTER TABLE "public"."OutOfOfficeReason" ALTER COLUMN "emoji" DROP NOT NULL;

-- CreateTable
CREATE TABLE "public"."OutOfOfficeReference" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "oooEntryId" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "externalReasonName" TEXT,
    "externalReasonId" TEXT,
    "credentialId" INTEGER,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutOfOfficeReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OutOfOfficeReference_uuid_key" ON "public"."OutOfOfficeReference"("uuid");

-- CreateIndex
CREATE INDEX "OutOfOfficeReference_oooEntryId_idx" ON "public"."OutOfOfficeReference"("oooEntryId");

-- CreateIndex
CREATE INDEX "OutOfOfficeReference_credentialId_idx" ON "public"."OutOfOfficeReference"("credentialId");

-- CreateIndex
CREATE UNIQUE INDEX "OutOfOfficeReference_source_externalId_key" ON "public"."OutOfOfficeReference"("source", "externalId");

-- AddForeignKey
ALTER TABLE "public"."OutOfOfficeReference" ADD CONSTRAINT "OutOfOfficeReference_oooEntryId_fkey" FOREIGN KEY ("oooEntryId") REFERENCES "public"."OutOfOfficeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OutOfOfficeReference" ADD CONSTRAINT "OutOfOfficeReference_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "public"."Credential"("id") ON DELETE SET NULL ON UPDATE CASCADE;
