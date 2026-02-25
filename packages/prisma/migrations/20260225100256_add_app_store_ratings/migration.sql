-- AlterTable
ALTER TABLE "public"."App" ADD COLUMN     "totalInstalls" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."AppStoreRating" (
    "id" SERIAL NOT NULL,
    "appSlug" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppStoreRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppStoreRating_appSlug_approved_idx" ON "public"."AppStoreRating"("appSlug", "approved");

-- CreateIndex
CREATE INDEX "AppStoreRating_approved_idx" ON "public"."AppStoreRating"("approved");

-- CreateIndex
CREATE UNIQUE INDEX "AppStoreRating_appSlug_userId_key" ON "public"."AppStoreRating"("appSlug", "userId");

-- AddForeignKey
ALTER TABLE "public"."AppStoreRating" ADD CONSTRAINT "AppStoreRating_appSlug_fkey" FOREIGN KEY ("appSlug") REFERENCES "public"."App"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AppStoreRating" ADD CONSTRAINT "AppStoreRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill totalInstalls from Credential count per app
UPDATE "public"."App" SET "totalInstalls" = sub.cnt
FROM (
  SELECT "appId", COUNT(*)::integer AS cnt
  FROM "public"."Credential"
  WHERE "appId" IS NOT NULL
  GROUP BY "appId"
) AS sub
WHERE "public"."App"."slug" = sub."appId";
