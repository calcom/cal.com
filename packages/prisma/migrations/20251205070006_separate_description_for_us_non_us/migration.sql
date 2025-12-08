/*
  Warnings:

  - Made the column `description` on table `policy_versions` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."policy_versions" ADD COLUMN     "descriptionNonUS" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "description" SET NOT NULL,
ALTER COLUMN "description" SET DEFAULT '';
