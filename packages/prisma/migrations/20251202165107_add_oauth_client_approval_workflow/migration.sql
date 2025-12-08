-- CreateEnum
CREATE TYPE "public"."OAuthClientApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "public"."OAuthClient" ADD COLUMN     "approvalStatus" "public"."OAuthClientApprovalStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "userId" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."OAuthClient" ADD CONSTRAINT "OAuthClient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "OAuthClient_userId_idx" ON "public"."OAuthClient"("userId");
