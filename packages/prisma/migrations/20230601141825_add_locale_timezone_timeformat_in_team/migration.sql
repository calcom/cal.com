-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "timeFormat" INTEGER,
ADD COLUMN     "timeZone" TEXT NOT NULL DEFAULT 'Europe/London',
ADD COLUMN     "weekStart" TEXT NOT NULL DEFAULT 'Sunday';
