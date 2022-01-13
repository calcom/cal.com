/*
  Warnings:

  - You are about to drop the `Credential` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Credential" DROP CONSTRAINT "Credential_userId_fkey";

-- DropTable
DROP TABLE "Credential";

-- CreateTable
CREATE TABLE "InstalledApp" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "key" JSONB NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "InstalledApp_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "InstalledApp" ADD CONSTRAINT "InstalledApp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;