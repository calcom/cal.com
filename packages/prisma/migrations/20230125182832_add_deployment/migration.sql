-- CreateTable
CREATE TABLE "Deployment" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "logo" TEXT,
    "theme" JSONB,
    "licenseKey" TEXT,
    "agreedLicenseAt" TIMESTAMP(3),

    CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id")
);
