/*
Warnings:

- You are about to drop the column `password` on the `users` table. All the data in the column will be lost.

 */
-- CreateTable
CREATE TABLE
  "UserPassword" (
    "hash" TEXT NOT NULL,
    "userId" INTEGER NOT NULL
  );

-- CreateIndex
CREATE UNIQUE INDEX "UserPassword_userId_key" ON "UserPassword" ("userId");

-- AddForeignKey
ALTER TABLE "UserPassword" ADD CONSTRAINT "UserPassword_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Inserts current user password into new table
INSERT INTO
  "UserPassword" ("hash", "userId")
SELECT
  u."password",
  u.id
FROM
  users u;

-- We rename instead of dropping the column to avoid possible data loss, will be dropped in the next migration.
ALTER TABLE "users"
RENAME COLUMN "password" TO "password_deprecated";
