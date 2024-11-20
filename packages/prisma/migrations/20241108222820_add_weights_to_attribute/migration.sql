-- AlterTable
ALTER TABLE "App_RoutingForms_FormResponse" ADD COLUMN     "chosenRouteId" TEXT;

-- AlterTable
ALTER TABLE "Attribute" ADD COLUMN     "isWeightsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "AttributeToUser" ADD COLUMN     "weight" INTEGER;
