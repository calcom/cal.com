-- AddForeignKey
ALTER TABLE "RoutingFormResponseField" ADD CONSTRAINT "RoutingFormResponseField_denormalized_fkey" FOREIGN KEY ("responseId") REFERENCES "RoutingFormResponseDenormalized"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
