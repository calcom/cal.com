-- CreateTable
CREATE TABLE "SelectedCalendar" (
    "userId" INTEGER NOT NULL,
    "integration" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,

    PRIMARY KEY ("userId","integration","externalId")
);

-- AddForeignKey
ALTER TABLE "SelectedCalendar" ADD FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
