-- CreateTable
CREATE TABLE "GlobalSettings" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "bookingLimits" JSONB,

    CONSTRAINT "GlobalSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GlobalSettings_userId_idx" ON "GlobalSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalSettings_userId_key" ON "GlobalSettings"("userId");

-- AddForeignKey
ALTER TABLE "GlobalSettings" ADD CONSTRAINT "GlobalSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
