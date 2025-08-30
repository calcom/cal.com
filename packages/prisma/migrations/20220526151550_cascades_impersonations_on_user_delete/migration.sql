-- DropForeignKey
ALTER TABLE "Impersonations" DROP CONSTRAINT "Impersonations_impersonatedById_fkey";

-- DropForeignKey
ALTER TABLE "Impersonations" DROP CONSTRAINT "Impersonations_impersonatedUserId_fkey";

-- AddForeignKey
ALTER TABLE "Impersonations" ADD CONSTRAINT "Impersonations_impersonatedUserId_fkey" FOREIGN KEY ("impersonatedUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Impersonations" ADD CONSTRAINT "Impersonations_impersonatedById_fkey" FOREIGN KEY ("impersonatedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
