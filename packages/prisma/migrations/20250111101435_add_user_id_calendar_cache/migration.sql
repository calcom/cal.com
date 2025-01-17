-- AlterTable
ALTER TABLE "CalendarCache" ADD COLUMN     "userId" INTEGER;

-- AddForeignKey
ALTER TABLE "CalendarCache" ADD CONSTRAINT "CalendarCache_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
