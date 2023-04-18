-- CreateTable
CREATE TABLE "Invite" (
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "expireInDays" INTEGER,
    "teamId" INTEGER NOT NULL,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invite_teamId_key" ON "Invite"("teamId");

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
