UPDATE "users" SET "plan" = 'FREE' WHERE "plan" = 'PRO' OR "plan" = 'TRIAL';
ALTER TABLE "users" ALTER COLUMN "plan" SET DEFAULT 'FREE';
