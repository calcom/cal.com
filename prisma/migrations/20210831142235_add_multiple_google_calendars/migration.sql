-- CreateTable
CREATE TABLE "ExternalAccount" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "userId" INTEGER,
    "credentialId" INTEGER,
    "integration" TEXT,
    "externalId" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT,
    "firstname" TEXT,
    "lastname" TEXT,
    "link" TEXT,
    "picture" TEXT,
    "gender" TEXT,
    "locale" TEXT,
    "organizationDomain" TEXT,

    PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ExternalAccount" ADD FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalAccount" ADD FOREIGN KEY ("credentialId") REFERENCES "Credential"("id") ON DELETE SET NULL ON UPDATE CASCADE;
