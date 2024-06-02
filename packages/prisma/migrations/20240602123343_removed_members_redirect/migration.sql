-- CreateTable
CREATE TABLE "removedOrgMembersRedirect" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "toProfileId" INTEGER NOT NULL,
    "fromUsername" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "removedOrgMembersRedirect_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "removedOrgMembersRedirect_teamId_fromUsername_key" ON "removedOrgMembersRedirect"("teamId", "fromUsername");

-- AddForeignKey
ALTER TABLE "removedOrgMembersRedirect" ADD CONSTRAINT "removedOrgMembersRedirect_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "removedOrgMembersRedirect" ADD CONSTRAINT "removedOrgMembersRedirect_toProfileId_fkey" FOREIGN KEY ("toProfileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
