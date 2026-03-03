-- AlterTable
ALTER TABLE "OAuthClient" ADD COLUMN "scopes" "AccessScope"[] NOT NULL DEFAULT '{}';
