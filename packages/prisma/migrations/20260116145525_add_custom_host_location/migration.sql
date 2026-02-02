-- AlterTable
ALTER TABLE "public"."EventType" ADD COLUMN     "enablePerHostLocations" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."HostLocation" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "eventTypeId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "credentialId" INTEGER,
    "link" TEXT,
    "address" TEXT,
    "phoneNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HostLocation_credentialId_idx" ON "public"."HostLocation"("credentialId");

-- CreateIndex
CREATE INDEX "HostLocation_eventTypeId_idx" ON "public"."HostLocation"("eventTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "HostLocation_userId_eventTypeId_key" ON "public"."HostLocation"("userId", "eventTypeId");

-- AddForeignKey
ALTER TABLE "public"."HostLocation" ADD CONSTRAINT "HostLocation_userId_eventTypeId_fkey" FOREIGN KEY ("userId", "eventTypeId") REFERENCES "public"."Host"("userId", "eventTypeId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HostLocation" ADD CONSTRAINT "HostLocation_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "public"."Credential"("id") ON DELETE SET NULL ON UPDATE CASCADE;
