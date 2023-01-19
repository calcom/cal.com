-- CreateEnum
CREATE TYPE "DeploymentLicenseType" AS ENUM ('FREE', 'EE');

-- CreateTable
CREATE TABLE "Deployment" (
    "id" SERIAL NOT NULL,
    "logo" TEXT,
    "theme" JSONB,
    "licenseKey" TEXT,
    "licenseType" "DeploymentLicenseType",
    "licenseConsentAt" TIMESTAMP(3),

    CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id")
);
