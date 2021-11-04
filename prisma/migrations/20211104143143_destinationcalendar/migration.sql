-- CreateTable
CREATE TABLE "DestinationCalendar" (
    "id" INTEGER NOT NULL,
    "integration" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,

    PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DestinationCalendar" ADD FOREIGN KEY ("id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
