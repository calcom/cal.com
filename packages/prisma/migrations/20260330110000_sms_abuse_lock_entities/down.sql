-- DropIndex
DROP INDEX IF EXISTS "SMSAbuseLock_entityType_lockState_idx";

-- DropIndex
DROP INDEX IF EXISTS "SMSAbuseLock_entityType_entityIdentifier_key";

-- DropTable
DROP TABLE IF EXISTS "SMSAbuseLock";

-- DropEnum
DROP TYPE IF EXISTS "SMSAbuseEntityType";
