-- CreateTable
CREATE TABLE "DSyncTeamGroupMapping" (
    "id" SERIAL NOT NULL,
    "orgId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "directoryId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,

    CONSTRAINT "DSyncTeamGroupMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DSyncTeamGroupMapping_teamId_groupName_key" ON "DSyncTeamGroupMapping"("teamId", "groupName");

-- AddForeignKey
ALTER TABLE "DSyncTeamGroupMapping" ADD CONSTRAINT "DSyncTeamGroupMapping_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
