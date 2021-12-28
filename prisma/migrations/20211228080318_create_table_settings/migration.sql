-- CreateTable
CREATE TABLE "Settings" (
    "id" SERIAL NOT NULL,
    "isEnabledUsingOneCredential" BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY ("id")
);

INSERT INTO "Settings" ("isEnabledUsingOneCredential") VALUES (false);