-- AlterTable
ALTER TABLE "Attendee" ADD COLUMN     "isOptionalTeamGuest" BOOLEAN DEFAULT false;

-- CreateTable
CREATE TABLE "_EventTypeToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_EventTypeToUser_AB_unique" ON "_EventTypeToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_EventTypeToUser_B_index" ON "_EventTypeToUser"("B");

-- AddForeignKey
ALTER TABLE "_EventTypeToUser" ADD CONSTRAINT "_EventTypeToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventTypeToUser" ADD CONSTRAINT "_EventTypeToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
