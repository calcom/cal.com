-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "color" TEXT NOT NULL DEFAULT '#FFFFFF';

-- Update default roles with color
UPDATE "Role" SET color = '#1BA774' WHERE id = 'owner_role';
UPDATE "Role" SET color = '#6633EE' WHERE id = 'admin_role';
UPDATE "Role" SET color = '#EAB308' WHERE id = 'member_role';
