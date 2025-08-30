-- CreateTable
CREATE TABLE "SecondaryEmail" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),

    CONSTRAINT "SecondaryEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SecondaryEmail_userId_idx" ON "SecondaryEmail"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SecondaryEmail_email_key" ON "SecondaryEmail"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SecondaryEmail_userId_email_key" ON "SecondaryEmail"("userId", "email");

-- AddForeignKey
ALTER TABLE "SecondaryEmail" ADD CONSTRAINT "SecondaryEmail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
