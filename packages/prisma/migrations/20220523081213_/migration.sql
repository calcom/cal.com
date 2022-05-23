/*
  Warnings:

  - The primary key for the `App_RoutingForms_Form` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "App_RoutingForms_FormResponse" DROP CONSTRAINT "App_RoutingForms_FormResponse_formId_fkey";

-- AlterTable
ALTER TABLE "App_RoutingForms_Form" DROP CONSTRAINT "App_RoutingForms_Form_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "App_RoutingForms_Form_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "App_RoutingForms_Form_id_seq";

-- AlterTable
ALTER TABLE "App_RoutingForms_FormResponse" ALTER COLUMN "formId" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "App_RoutingForms_FormResponse" ADD CONSTRAINT "App_RoutingForms_FormResponse_formId_fkey" FOREIGN KEY ("formId") REFERENCES "App_RoutingForms_Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;
