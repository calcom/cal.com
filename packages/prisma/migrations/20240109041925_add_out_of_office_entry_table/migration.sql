-- CreateTable
CREATE TABLE "OutOfOfficeEntry" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "toUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutOfOfficeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OutOfOfficeEntry_uuid_key" ON "OutOfOfficeEntry"("uuid");

-- CreateIndex
CREATE INDEX "OutOfOfficeEntry_uuid_idx" ON "OutOfOfficeEntry"("uuid");

-- CreateIndex
CREATE INDEX "OutOfOfficeEntry_userId_idx" ON "OutOfOfficeEntry"("userId");

-- CreateIndex
CREATE INDEX "OutOfOfficeEntry_toUserId_idx" ON "OutOfOfficeEntry"("toUserId");

-- CreateIndex
CREATE INDEX "OutOfOfficeEntry_start_end_idx" ON "OutOfOfficeEntry"("start", "end");

-- AddForeignKey
ALTER TABLE "OutOfOfficeEntry" ADD CONSTRAINT "OutOfOfficeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutOfOfficeEntry" ADD CONSTRAINT "OutOfOfficeEntry_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
