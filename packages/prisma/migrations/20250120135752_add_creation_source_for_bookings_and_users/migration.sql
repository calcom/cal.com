-- CreateEnum
CREATE TYPE "CreationSource" AS ENUM ('api_v1', 'api_v2', 'webapp');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "creationSource" "CreationSource";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "creationSource" "CreationSource";
