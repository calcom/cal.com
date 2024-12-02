-- CreateEnum
CREATE TYPE "BlacklistType" AS ENUM ('EMAIL', 'DOMAIN', 'USERNAME');

-- CreateTable
CREATE TABLE "Blacklist" (
    "id" TEXT NOT NULL,
    "type" "BlacklistType" NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" INTEGER,

    CONSTRAINT "Blacklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Blacklist_id_key" ON "Blacklist"("id");

-- CreateIndex
CREATE INDEX "Blacklist_type_value_idx" ON "Blacklist"("type", "value");

-- CreateIndex
CREATE UNIQUE INDEX "Blacklist_type_value_key" ON "Blacklist"("type", "value");

-- AddForeignKey
ALTER TABLE "Blacklist" ADD CONSTRAINT "Blacklist_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blacklist" ADD CONSTRAINT "Blacklist_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
