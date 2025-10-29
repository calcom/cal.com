-- AlterTable
ALTER TABLE "public"."Feature" ADD COLUMN     "rolloutPercentage" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "salt" TEXT NOT NULL DEFAULT '';
