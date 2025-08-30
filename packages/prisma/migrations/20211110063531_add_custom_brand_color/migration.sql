-- AlterTable
ALTER TABLE "users" ADD COLUMN     "brandColor" TEXT NOT NULL DEFAULT E'#292929';
UPDATE "users" SET "brandColor" = '#292929';
