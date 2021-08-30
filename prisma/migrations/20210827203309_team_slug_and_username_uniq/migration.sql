/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Team` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[username]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "EventType.slug_unique";

-- CreateIndex
CREATE UNIQUE INDEX "Team.slug_unique" ON "Team"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users.username_unique" ON "users"("username");
