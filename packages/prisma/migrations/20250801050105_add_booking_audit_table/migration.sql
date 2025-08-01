-- CreateTable
CREATE TABLE "BookingAudit" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "actor" TEXT,
    "version" INTEGER,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingAudit_pkey" PRIMARY KEY ("id")
);
