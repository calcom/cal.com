-- CreateTable
CREATE TABLE "EventTypeCustomInput" (
    "id" SERIAL NOT NULL,
    "eventTypeId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL,

    PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EventTypeCustomInput" ADD FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
