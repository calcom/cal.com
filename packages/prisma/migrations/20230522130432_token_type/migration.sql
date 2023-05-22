-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('TEAM_INVITE', 'VERIFY_ACCOUNT');

-- AlterTable
ALTER TABLE "VerificationToken" ADD COLUMN     "type" "TokenType";
