-- CreateEnum
CREATE TYPE "RRTimestampBasis" AS ENUM ('CREATED_AT', 'START_TIME');

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "rrTimestampBasis" "RRTimestampBasis" DEFAULT 'CREATED_AT';
