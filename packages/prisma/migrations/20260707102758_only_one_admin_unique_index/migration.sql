CREATE UNIQUE INDEX "only_one_admin_idx"
ON "users" (role)
WHERE role = 'ADMIN';