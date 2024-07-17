-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "isOrganization" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "OrganizationSettings" (
    "id" SERIAL NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "isOrganizationConfigured" BOOLEAN NOT NULL DEFAULT false,
    "isOrganizationVerified" BOOLEAN NOT NULL DEFAULT false,
    "orgAutoAcceptEmail" TEXT NOT NULL,

    CONSTRAINT "OrganizationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSettings_organizationId_key" ON "OrganizationSettings"("organizationId");

-- AddForeignKey
ALTER TABLE "OrganizationSettings" ADD CONSTRAINT "OrganizationSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Manually written queries below
--

-- Set team field to notify if it is an organization -> Easier than metadata.parse(X).isOrganization
UPDATE "Team"
    SET "isOrganization" = (metadata ->> 'isOrganization')::BOOLEAN
WHERE
    metadata ->> 'isOrganization' = 'true';

-- Insert data into org settings
INSERT INTO "OrganizationSettings" ("organizationId", "isOrganizationConfigured", "orgAutoAcceptEmail", "isOrganizationVerified")
SELECT
	t.id,
	COALESCE((t.metadata ->> 'isOrganizationConfigured')::BOOLEAN, false) AS "isOrganizationConfigured",
	COALESCE((t.metadata ->> 'orgAutoAcceptEmail'), '') AS "orgAutoAcceptEmail",
	COALESCE((t.metadata ->> 'isOrganizationVerified')::BOOLEAN, false) AS "isOrganizationVerified"
FROM (
	SELECT
		id,
		metadata
	FROM
		"Team"
	WHERE
		metadata ->> 'isOrganization' = 'true'
) AS t;