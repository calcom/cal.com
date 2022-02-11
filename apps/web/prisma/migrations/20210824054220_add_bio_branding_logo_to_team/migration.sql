-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "hideBranding" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "logo" TEXT;
