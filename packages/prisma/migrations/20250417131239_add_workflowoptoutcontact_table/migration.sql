-- CreateEnum
CREATE TYPE "WorkflowContactType" AS ENUM ('PHONE', 'EMAIL');

-- CreateTable
CREATE TABLE "WorkflowOptOutContact" (
    "id" SERIAL NOT NULL,
    "type" "WorkflowContactType" NOT NULL,
    "value" TEXT NOT NULL,
    "optedOut" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowOptOutContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowOptOutContact_type_value_key" ON "WorkflowOptOutContact"("type", "value");
