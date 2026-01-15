-- CreateTable
CREATE TABLE "public"."UserHolidaySettings" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "countryCode" TEXT,
    "disabledIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserHolidaySettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserHolidaySettings_userId_key" ON "public"."UserHolidaySettings"("userId");

-- AddForeignKey
ALTER TABLE "public"."UserHolidaySettings" ADD CONSTRAINT "UserHolidaySettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
