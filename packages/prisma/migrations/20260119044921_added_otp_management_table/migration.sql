-- CreateTable
CREATE TABLE "otp_verification" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "hashedOtp" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isInvalidated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "otp_verification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "otp_verification_phoneNumber_isVerified_isInvalidated_expir_idx" ON "otp_verification"("phoneNumber", "isVerified", "isInvalidated", "expiresAt");
