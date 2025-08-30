/*
  Warnings:

  - You are about to drop the column `plan` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "plan";

-- DropEnum
DROP TYPE "UserPlan";
