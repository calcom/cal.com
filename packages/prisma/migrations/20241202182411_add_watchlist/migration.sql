-- CreateEnum
CREATE TYPE "WatchlistType" AS ENUM ('EMAIL', 'DOMAIN', 'USERNAME');

-- CreateTable
CREATE TABLE "Watchlist" (
    "id" TEXT NOT NULL,
    "type" "WatchlistType" NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" INTEGER,

    CONSTRAINT "Watchlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Watchlist_id_key" ON "Watchlist"("id");

-- CreateIndex
CREATE INDEX "Watchlist_type_value_idx" ON "Watchlist"("type", "value");

-- CreateIndex
CREATE UNIQUE INDEX "Watchlist_type_value_key" ON "Watchlist"("type", "value");

-- AddForeignKey
ALTER TABLE "Watchlist" ADD CONSTRAINT "Watchlist_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Watchlist" ADD CONSTRAINT "Watchlist_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
