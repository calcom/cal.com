-- CreateTable
CREATE TABLE "_LinkedUsers" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_LinkedUsers_AB_unique" ON "_LinkedUsers"("A", "B");

-- CreateIndex
CREATE INDEX "_LinkedUsers_B_index" ON "_LinkedUsers"("B");

-- AddForeignKey
ALTER TABLE "_LinkedUsers" ADD CONSTRAINT "_LinkedUsers_A_fkey" FOREIGN KEY ("A") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LinkedUsers" ADD CONSTRAINT "_LinkedUsers_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
