-- CreateEnum
CREATE TYPE "UserPlan" AS ENUM ('FREE', 'TRIAL', 'PRO');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "plan" "UserPlan" NOT NULL DEFAULT E'PRO';
