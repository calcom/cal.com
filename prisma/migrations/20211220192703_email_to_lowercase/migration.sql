-- DropIndex
DROP INDEX "users.email_unique";
-- UpdateTable
UPDATE users SET email=LOWER(email);
-- CreateIndex
CREATE UNIQUE INDEX "users.email_unique" ON "users"("email");
