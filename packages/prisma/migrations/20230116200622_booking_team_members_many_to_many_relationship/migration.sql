-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_userId_fkey";

-- CreateTable
CREATE TABLE "_BookingToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_BookingToUser_AB_unique" ON "_BookingToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_BookingToUser_B_index" ON "_BookingToUser"("B");

-- AddForeignKey
ALTER TABLE "_BookingToUser" ADD CONSTRAINT "_BookingToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BookingToUser" ADD CONSTRAINT "_BookingToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
