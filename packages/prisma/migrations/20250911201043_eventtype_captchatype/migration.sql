-- CreateEnum
CREATE TYPE "CaptchaType" AS ENUM ('off', 'low', 'medium', 'high');

-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "captchaType" "CaptchaType" DEFAULT 'off';
