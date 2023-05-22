-- AlterTable
ALTER TABLE "users" ADD COLUMN     "dailyDigestEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dailyDigestTime" TIME;
