-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "smsCredits" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "smsCredits" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CountrySMSCredits" (
    "id" TEXT NOT NULL,
    "iso" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,

    CONSTRAINT "CountrySMSCredits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CountrySMSCredits_id_key" ON "CountrySMSCredits"("id");
