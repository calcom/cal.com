-- CreateTable
CREATE TABLE "OverlayUser" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,

    CONSTRAINT "OverlayUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OverlayCredential" (
    "id" SERIAL NOT NULL,
    "key" JSONB NOT NULL,
    "type" TEXT NOT NULL,
    "appId" TEXT,
    "invalid" BOOLEAN DEFAULT false,
    "userId" INTEGER,

    CONSTRAINT "OverlayCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OverlayUser_email_key" ON "OverlayUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "OverlayUser_provider_providerAccountId_key" ON "OverlayUser"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "OverlayCredential_userId_key" ON "OverlayCredential"("userId");

-- AddForeignKey
ALTER TABLE "OverlayCredential" ADD CONSTRAINT "OverlayCredential_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OverlayCredential" ADD CONSTRAINT "OverlayCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "OverlayUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
