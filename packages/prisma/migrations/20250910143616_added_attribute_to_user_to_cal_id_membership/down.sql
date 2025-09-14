-- DropForeignKey
ALTER TABLE "AttributeToUser" DROP CONSTRAINT "AttributeToUser_calIdMemberId_fkey";

-- DropIndex
DROP INDEX "AttributeToUser_calIdMemberId_attributeOptionId_key";

-- AlterTable
ALTER TABLE "AttributeToUser" DROP COLUMN "calIdMemberId";

