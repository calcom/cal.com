-- AddForeignKey
ALTER TABLE "BookingReport" ADD CONSTRAINT "BookingReport_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
