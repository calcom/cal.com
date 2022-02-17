-- CreateTable
CREATE TABLE "InstalledApp" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "key" JSONB NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "InstalledApp_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "InstalledApp" ADD FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;