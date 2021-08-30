/*
  Warnings:

  - You are about to drop the `OrganizersOnEventType` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "OrganizersOnEventType" DROP CONSTRAINT "OrganizersOnEventType_eventTypeId_fkey";

-- DropForeignKey
ALTER TABLE "OrganizersOnEventType" DROP CONSTRAINT "OrganizersOnEventType_userId_fkey";

-- DropTable
DROP TABLE "OrganizersOnEventType";

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
ALTER TABLE "_EventTypeToUser" ADD FOREIGN KEY ("A") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventTypeToUser" ADD FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
