
-- CreateEnum
CREATE TYPE "SchedulingType" AS ENUM ('roundRobin', 'collective');

ADD COLUMN     "schedulingType" "SchedulingType",
ADD COLUMN     "teamId" INTEGER;

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
ALTER TABLE "EventType" ADD FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventTypeToUser" ADD FOREIGN KEY ("A") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventTypeToUser" ADD FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
