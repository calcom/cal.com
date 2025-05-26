/*
  Warnings:

  - Added the required column `updatedAt` to the `App_RoutingForms_FormResponse` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "App_RoutingForms_FormResponse" ADD COLUMN     "updatedAt" TIMESTAMP(3);
