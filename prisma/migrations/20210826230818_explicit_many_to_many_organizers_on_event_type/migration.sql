/*
  Warnings:

  - You are about to drop the `_EventTypeToUser` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_EventTypeToUser" DROP CONSTRAINT "_EventTypeToUser_A_fkey";

-- DropForeignKey
ALTER TABLE "_EventTypeToUser" DROP CONSTRAINT "_EventTypeToUser_B_fkey";

-- DropTable
DROP TABLE "_EventTypeToUser";

-- CreateTable
CREATE TABLE "OrganizersOnEventType" (
    "eventTypeId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    PRIMARY KEY ("eventTypeId","userId")
);

-- AddForeignKey
ALTER TABLE "OrganizersOnEventType" ADD FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizersOnEventType" ADD FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
