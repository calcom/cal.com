-- AlterTable
ALTER TABLE "_PlatformOAuthClientToUser" ADD CONSTRAINT "_PlatformOAuthClientToUser_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_PlatformOAuthClientToUser_AB_unique";

-- AlterTable
ALTER TABLE "_user_eventtype" ADD CONSTRAINT "_user_eventtype_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_user_eventtype_AB_unique";
