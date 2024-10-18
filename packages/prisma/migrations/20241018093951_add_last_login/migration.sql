-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lastLogin" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "users_lastLogin_idx" ON "users"("lastLogin");
