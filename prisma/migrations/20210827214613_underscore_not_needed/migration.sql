/*
  Warnings:

  - You are about to drop the `__user_eventtype` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "__user_eventtype" DROP CONSTRAINT "__user_eventtype_A_fkey";

-- DropForeignKey
ALTER TABLE "__user_eventtype" DROP CONSTRAINT "__user_eventtype_B_fkey";

-- DropTable
DROP TABLE "__user_eventtype";

-- CreateTable
CREATE TABLE "_user_eventtype" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_user_eventtype_AB_unique" ON "_user_eventtype"("A", "B");

-- CreateIndex
CREATE INDEX "_user_eventtype_B_index" ON "_user_eventtype"("B");

-- AddForeignKey
ALTER TABLE "_user_eventtype" ADD FOREIGN KEY ("A") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_user_eventtype" ADD FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
