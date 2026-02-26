-- CreateTable
CREATE TABLE "ExternalAvatar" (
    "email" TEXT NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalAvatar_pkey" PRIMARY KEY ("email")
);
