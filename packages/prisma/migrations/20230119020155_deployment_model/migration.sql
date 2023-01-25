-- CreateTable
CREATE TABLE "Deployment" (
    "id" SERIAL NOT NULL,
    "logo" TEXT,
    "theme" JSONB,
    "licenseKey" TEXT,
    "licenseConsentAt" TIMESTAMP(3),

    CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id")
);
