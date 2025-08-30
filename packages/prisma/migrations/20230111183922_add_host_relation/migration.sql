-- CreateTable
CREATE TABLE "Host" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "eventTypeId" INTEGER NOT NULL,
    "isFixed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Host_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Host" ADD CONSTRAINT "Host_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Host" ADD CONSTRAINT "Host_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;