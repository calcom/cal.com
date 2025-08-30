-- CreateEnum
CREATE TYPE "UserPermissionRole" AS ENUM ('USER', 'ADMIN');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "UserPermissionRole" NOT NULL DEFAULT E'USER';

-- CreateTable
CREATE TABLE "Impersonations" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "impersonatedUserId" INTEGER NOT NULL,
    "impersonatedById" INTEGER NOT NULL,

    CONSTRAINT "Impersonations_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Impersonations" ADD CONSTRAINT "Impersonations_impersonatedUserId_fkey" FOREIGN KEY ("impersonatedUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Impersonations" ADD CONSTRAINT "Impersonations_impersonatedById_fkey" FOREIGN KEY ("impersonatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
