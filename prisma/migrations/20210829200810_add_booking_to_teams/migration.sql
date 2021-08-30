-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "teamId" INTEGER;

-- AddForeignKey
ALTER TABLE "Booking" ADD FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
