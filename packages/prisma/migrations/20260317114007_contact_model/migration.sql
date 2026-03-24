-- CreateTable
CREATE TABLE "CalIdContact" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "metadata" JSONB,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalIdContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalIdContact_userId_idx" ON "CalIdContact"("userId");

-- CreateIndex
CREATE INDEX "CalIdContact_userId_createdAt_idx" ON "CalIdContact"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "CalIdContact" ADD CONSTRAINT "CalIdContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
