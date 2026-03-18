ALTER TABLE "OAuthClient" ADD COLUMN "redirectUris" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "OAuthClient" SET "redirectUris" = ARRAY["redirectUri"];

ALTER TABLE "OAuthClient" ALTER COLUMN "redirectUris" DROP DEFAULT;
ALTER TABLE "OAuthClient" ALTER COLUMN "redirectUris" SET NOT NULL;
