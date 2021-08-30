-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_userId_fkey";

-- CreateTable
CREATE TABLE "_user_booking" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_user_booking_AB_unique" ON "_user_booking"("A", "B");

-- CreateIndex
CREATE INDEX "_user_booking_B_index" ON "_user_booking"("B");

-- AddForeignKey
ALTER TABLE "_user_booking" ADD FOREIGN KEY ("A") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_user_booking" ADD FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
