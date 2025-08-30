-- CreateTable
CREATE TABLE "DSyncData" (
    "id" SERIAL NOT NULL,
    "directoryId" TEXT NOT NULL,
    "tenant" TEXT NOT NULL,
    "orgId" INTEGER,

    CONSTRAINT "DSyncData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DSyncData_orgId_key" ON "DSyncData"("orgId");

-- AddForeignKey
ALTER TABLE "DSyncData" ADD CONSTRAINT "DSyncData_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
