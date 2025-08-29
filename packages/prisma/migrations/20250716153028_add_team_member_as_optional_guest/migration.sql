-- CreateTable
CREATE TABLE "_optional_guest_team_members" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_optional_guest_team_members_AB_unique" ON "_optional_guest_team_members"("A", "B");

-- CreateIndex
CREATE INDEX "_optional_guest_team_members_B_index" ON "_optional_guest_team_members"("B");

-- AddForeignKey
ALTER TABLE "_optional_guest_team_members" ADD CONSTRAINT "_optional_guest_team_members_A_fkey" FOREIGN KEY ("A") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_optional_guest_team_members" ADD CONSTRAINT "_optional_guest_team_members_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
