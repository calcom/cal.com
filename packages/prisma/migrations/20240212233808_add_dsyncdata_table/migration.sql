/*
  Warnings:

  - You are about to drop the column `password_deprecated` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "password_deprecated";

-- CreateTable
CREATE TABLE "DSyncData" (
    "id" SERIAL NOT NULL,
    "directoryId" TEXT NOT NULL,
    "tenant" TEXT NOT NULL,
    "teamId" INTEGER,

    CONSTRAINT "DSyncData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DSyncData_teamId_key" ON "DSyncData"("teamId");

-- AddForeignKey
ALTER TABLE "DSyncData" ADD CONSTRAINT "DSyncData_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
