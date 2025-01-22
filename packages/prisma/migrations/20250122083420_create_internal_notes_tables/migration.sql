-- CreateTable
CREATE TABLE "InternalNotePreset" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "cancellationReason" TEXT,
    "teamId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InternalNotePreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingInternalNote" (
    "id" SERIAL NOT NULL,
    "notePresetId" INTEGER,
    "text" TEXT,
    "bookingId" INTEGER NOT NULL,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingInternalNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InternalNotePreset_teamId_idx" ON "InternalNotePreset"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "InternalNotePreset_teamId_name_key" ON "InternalNotePreset"("teamId", "name");

-- CreateIndex
CREATE INDEX "BookingInternalNote_bookingId_idx" ON "BookingInternalNote"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "BookingInternalNote_bookingId_notePresetId_key" ON "BookingInternalNote"("bookingId", "notePresetId");

-- CreateIndex
CREATE INDEX "Impersonations_impersonatedUserId_idx" ON "Impersonations"("impersonatedUserId");

-- CreateIndex
CREATE INDEX "Impersonations_impersonatedById_idx" ON "Impersonations"("impersonatedById");

-- AddForeignKey
ALTER TABLE "InternalNotePreset" ADD CONSTRAINT "InternalNotePreset_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingInternalNote" ADD CONSTRAINT "BookingInternalNote_notePresetId_fkey" FOREIGN KEY ("notePresetId") REFERENCES "InternalNotePreset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingInternalNote" ADD CONSTRAINT "BookingInternalNote_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingInternalNote" ADD CONSTRAINT "BookingInternalNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
