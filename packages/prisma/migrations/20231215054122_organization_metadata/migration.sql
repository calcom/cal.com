-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "isOrganization" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "OrganizationSettings" (
    "id" SERIAL NOT NULL,
    "teamId" INTEGER NOT NULL,
    "isOrganizationConfigured" BOOLEAN NOT NULL DEFAULT false,
    "isOrganizationVerified" BOOLEAN NOT NULL DEFAULT false,
    "orgAutoAcceptEmail" TEXT NOT NULL,

    CONSTRAINT "OrganizationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSettings_teamId_key" ON "OrganizationSettings"("teamId");

-- AddForeignKey
ALTER TABLE "OrganizationSettings" ADD CONSTRAINT "OrganizationSettings_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Set team field to notify if it is an organization -> Easier than metadata.parse(X).isOrganization
UPDATE "Team"
    SET "isOrganization" = (metadata ->> 'isOrganization')::BOOLEAN
WHERE
    metadata ->> 'isOrganization' = 'true';

-- Insert data into org settings
INSERT INTO "OrganizationSettings" ("teamId", "isOrganizationConfigured", "orgAutoAcceptEmail", "isOrganizationVerified")
SELECT
	t.id,
	(t.metadata ->> 'isOrganizationConfigured')::BOOLEAN AS "isOrganizationConfigured",
	t.metadata ->> 'orgAutoAcceptEmail' AS "orgAutoAcceptEmail",
	(t.metadata ->> 'isOrganizationVerified')::BOOLEAN AS "isOrganizationVerified"
FROM (
	SELECT
		id,
		metadata
	FROM
		"Team"
	WHERE
		metadata ->> 'isOrganization' = 'true'
) AS t;