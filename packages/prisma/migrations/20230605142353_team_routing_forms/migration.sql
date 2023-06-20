-- AlterTable
ALTER TABLE "App_RoutingForms_Form" ADD COLUMN     "teamId" INTEGER;

-- AddForeignKey
ALTER TABLE "App_RoutingForms_Form" ADD CONSTRAINT "App_RoutingForms_Form_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
