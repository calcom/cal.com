-- CreateTable
CREATE TABLE "InstalledApp" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "key" JSONB NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "InstalledApp_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "InstalledApp" ADD CONSTRAINT "InstalledApp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
