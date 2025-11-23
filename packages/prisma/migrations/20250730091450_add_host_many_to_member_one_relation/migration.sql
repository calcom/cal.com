-- AlterTable
ALTER TABLE "Host" ADD COLUMN     "memberId" INTEGER;

-- AddForeignKey
ALTER TABLE "Host" ADD CONSTRAINT "Host_memberId_fkey"
  FOREIGN KEY ("memberId")
  REFERENCES "Membership"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

CREATE INDEX "Host_memberId_idx" ON "Host"("memberId");
