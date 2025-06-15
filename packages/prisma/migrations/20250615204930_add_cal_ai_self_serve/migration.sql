-- CreateTable
CREATE TABLE "AISelfServeConfiguration" (
    "id" SERIAL NOT NULL,
    "eventTypeId" INTEGER NOT NULL,
    "yourPhoneNumberId" INTEGER,
    "numberToCall" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "agentId" TEXT NOT NULL,
    "llmId" TEXT NOT NULL,
    "agentTimeZone" TEXT NOT NULL,

    CONSTRAINT "AISelfServeConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalAiPhoneNumber" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "provider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalAiPhoneNumber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AISelfServeConfiguration_yourPhoneNumberId_key" ON "AISelfServeConfiguration"("yourPhoneNumberId");

-- CreateIndex
CREATE INDEX "AISelfServeConfiguration_eventTypeId_idx" ON "AISelfServeConfiguration"("eventTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "AISelfServeConfiguration_eventTypeId_key" ON "AISelfServeConfiguration"("eventTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "CalAiPhoneNumber_phoneNumber_key" ON "CalAiPhoneNumber"("phoneNumber");

-- CreateIndex
CREATE INDEX "CalAiPhoneNumber_userId_idx" ON "CalAiPhoneNumber"("userId");

-- AddForeignKey
ALTER TABLE "AISelfServeConfiguration" ADD CONSTRAINT "AISelfServeConfiguration_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AISelfServeConfiguration" ADD CONSTRAINT "AISelfServeConfiguration_yourPhoneNumberId_fkey" FOREIGN KEY ("yourPhoneNumberId") REFERENCES "CalAiPhoneNumber"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalAiPhoneNumber" ADD CONSTRAINT "CalAiPhoneNumber_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
