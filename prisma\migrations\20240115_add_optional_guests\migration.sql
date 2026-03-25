-- CreateTable for optional guests relationship
CREATE TABLE "_OptionalGuestEventTypes" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_OptionalGuestEventTypes_AB_unique" ON "_OptionalGuestEventTypes"("A", "B");
CREATE INDEX "_OptionalGuestEventTypes_B_index" ON "_OptionalGuestEventTypes"("B");

-- AddForeignKey
ALTER TABLE "_OptionalGuestEventTypes" ADD CONSTRAINT "_OptionalGuestEventTypes_A_fkey" FOREIGN KEY ("A") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_OptionalGuestEventTypes" ADD CONSTRAINT "_OptionalGuestEventTypes_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
