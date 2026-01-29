-- AlterTable
ALTER TABLE "public"."Team" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Team_deletedAt_idx" ON "public"."Team"("deletedAt");
