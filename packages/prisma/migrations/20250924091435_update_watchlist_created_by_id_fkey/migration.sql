-- DropForeignKey
ALTER TABLE "Watchlist" DROP CONSTRAINT "Watchlist_createdById_fkey";

-- AlterTable
ALTER TABLE "Watchlist" ALTER COLUMN "createdById" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Watchlist" ADD CONSTRAINT "Watchlist_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
