-- AlterTable
ALTER TABLE "App_RoutingForms_Form" ADD COLUMN     "updatedById" INTEGER;

-- AddForeignKey
ALTER TABLE "App_RoutingForms_Form" ADD CONSTRAINT "App_RoutingForms_Form_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
