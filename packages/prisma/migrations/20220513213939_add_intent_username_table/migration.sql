-- CreateTable
CREATE TABLE "IntentUsername" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "currentUsername" TEXT NOT NULL,
    "intentUsername" TEXT NOT NULL,
    "isIntentPremium" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntentUsername_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "IntentUsername" ADD CONSTRAINT "IntentUsername_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
