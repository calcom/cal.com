-- CreateTable
CREATE TABLE "ZohoSchedulingSetup" (
    "id" SERIAL NOT NULL,
    "zuid" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZohoSchedulingSetup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ZohoSchedulingSetup_zuid_key" ON "ZohoSchedulingSetup"("zuid");

-- AddForeignKey
ALTER TABLE "ZohoSchedulingSetup" ADD CONSTRAINT "ZohoSchedulingSetup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
