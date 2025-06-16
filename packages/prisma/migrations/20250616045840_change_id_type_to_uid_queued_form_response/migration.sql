/*
  Warnings:

  - The primary key for the `App_RoutingForms_QueuedFormResponse` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "App_RoutingForms_QueuedFormResponse" DROP CONSTRAINT "App_RoutingForms_QueuedFormResponse_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "App_RoutingForms_QueuedFormResponse_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "App_RoutingForms_QueuedFormResponse_id_seq";
