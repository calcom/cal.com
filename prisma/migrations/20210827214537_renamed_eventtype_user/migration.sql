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
CREATE TABLE "__user_eventtype" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "__user_eventtype_AB_unique" ON "__user_eventtype"("A", "B");

-- CreateIndex
CREATE INDEX "__user_eventtype_B_index" ON "__user_eventtype"("B");

-- AddForeignKey
ALTER TABLE "__user_eventtype" ADD FOREIGN KEY ("A") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "__user_eventtype" ADD FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
