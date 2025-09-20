-- CreateEnum
CREATE TYPE "Plans" AS ENUM ('ENTERPRISE', 'ORGANIZATIONS', 'TEAMS');

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "plan" "Plans";

-- Update data for existing records
UPDATE public."Team" AS child_team
SET "plan" = CASE
  WHEN parent_team."id" IS NOT NULL
    AND parent_team."isOrganization" = true
    AND parent_team."isPlatform" = false
	THEN 'ORGANIZATIONS'::"Plans"
  WHEN child_team."isOrganization" = true AND child_team."isPlatform" = false
  	THEN 'ORGANIZATIONS'::"Plans"
  WHEN child_team."isOrganization" = false
  	THEN 'TEAMS'::"Plans"
  ELSE NULL
END
FROM public."Team" AS parent_team
WHERE parent_team."id" = child_team."parentId"
   OR child_team."parentId" IS NULL;
