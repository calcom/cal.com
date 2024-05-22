-- AlterTable
ALTER TABLE "Credential" ADD COLUMN     "settings" JSONB NOT NULL DEFAULT '{ "empty": "true" }';
