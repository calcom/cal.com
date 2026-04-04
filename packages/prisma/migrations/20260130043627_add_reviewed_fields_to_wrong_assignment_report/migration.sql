-- AlterTable
ALTER TABLE "public"."WrongAssignmentReport" ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" INTEGER;

-- CreateIndex
CREATE INDEX "WrongAssignmentReport_reviewedById_idx" ON "public"."WrongAssignmentReport"("reviewedById");

-- AddForeignKey
ALTER TABLE "public"."WrongAssignmentReport" ADD CONSTRAINT "WrongAssignmentReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
