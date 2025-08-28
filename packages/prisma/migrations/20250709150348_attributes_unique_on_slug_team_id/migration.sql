/*
  Warnings:

  - A unique constraint covering the columns `[teamId,slug]` on the table `Attribute` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Attribute_slug_key";

-- CreateIndex
CREATE UNIQUE INDEX "Attribute_teamId_slug_key" ON "Attribute"("teamId", "slug");
