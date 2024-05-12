/*
  Warnings:

  - The values [MICROSOFT] on the enum `IdentityProvider` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `ext_expires_in` on the `Account` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "IdentityProvider_new" AS ENUM ('CAL', 'GOOGLE', 'SAML');
ALTER TABLE "users" ALTER COLUMN "identityProvider" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "identityProvider" TYPE "IdentityProvider_new" USING ("identityProvider"::text::"IdentityProvider_new");
ALTER TYPE "IdentityProvider" RENAME TO "IdentityProvider_old";
ALTER TYPE "IdentityProvider_new" RENAME TO "IdentityProvider";
DROP TYPE "IdentityProvider_old";
ALTER TABLE "users" ALTER COLUMN "identityProvider" SET DEFAULT 'CAL';
COMMIT;

-- AlterTable
ALTER TABLE "Account" DROP COLUMN "ext_expires_in";
