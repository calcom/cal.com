-- AlterTable
ALTER TABLE "App_RoutingForms_Form" ALTER COLUMN "route" SET DEFAULT E'',
ALTER COLUMN "fields" DROP NOT NULL;
