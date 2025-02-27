-- CreateEnum
CREATE TYPE "RRResetInterval" AS ENUM ('MONTH', 'DAY');

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "rrResetInterval" "RRResetInterval" DEFAULT 'MONTH';
