-- DropIndex
DROP INDEX "SecondaryEmail_email_key";

-- DropIndex
DROP INDEX "SecondaryEmail_userId_idx";

-- AlterTable
ALTER TABLE "SecondaryEmail" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "emailPrimary" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "UsernameAlias" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "username" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsernameAlias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UsernameAlias_username_idx" ON "UsernameAlias"("username");

-- CreateIndex
CREATE UNIQUE INDEX "UsernameAlias_userId_username_key" ON "UsernameAlias"("userId", "username");

-- AddForeignKey
ALTER TABLE "UsernameAlias" ADD CONSTRAINT "UsernameAlias_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
