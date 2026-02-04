-- AlterTable
ALTER TABLE "public"."OAuthClient" ADD COLUMN     "isTrusted" BOOLEAN NOT NULL DEFAULT false;
