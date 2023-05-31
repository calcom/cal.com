/*
  Warnings:

  - A unique constraint covering the columns `[slug,parentId]` on the table `Team` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email,username]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[username,organizationId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Team_slug_key";

-- DropIndex
DROP INDEX "users_email_idx";

-- DropIndex
DROP INDEX "users_username_key";

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "parentId" INTEGER;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "organizationId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Team_slug_parentId_key" ON "Team"("slug", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_slug_parentId_key_null" ON "Team"("slug", ("parentId" IS NULL)) WHERE "parentId" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_email_username_key" ON "users"("email", "username");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_organizationId_key" ON "users"("username", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_organizationId_key_null" ON "users"("username", ("organizationId" IS NULL)) WHERE "organizationId" IS NULL;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FeatureFlags
INSERT INTO "Feature" (slug, enabled, description, "type")
VALUES ('organizations', true, 'Manage organizations with multiple teams', 'OPERATIONAL')
ON CONFLICT (slug) DO NOTHING;
