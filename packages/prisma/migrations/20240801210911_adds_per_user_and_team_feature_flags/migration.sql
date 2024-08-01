-- CreateTable
CREATE TABLE "_user_features" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_team_features" (
    "A" TEXT NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_user_features_AB_unique" ON "_user_features"("A", "B");

-- CreateIndex
CREATE INDEX "_user_features_B_index" ON "_user_features"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_team_features_AB_unique" ON "_team_features"("A", "B");

-- CreateIndex
CREATE INDEX "_team_features_B_index" ON "_team_features"("B");

-- AddForeignKey
ALTER TABLE "_user_features" ADD CONSTRAINT "_user_features_A_fkey" FOREIGN KEY ("A") REFERENCES "Feature"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_user_features" ADD CONSTRAINT "_user_features_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_team_features" ADD CONSTRAINT "_team_features_A_fkey" FOREIGN KEY ("A") REFERENCES "Feature"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_team_features" ADD CONSTRAINT "_team_features_B_fkey" FOREIGN KEY ("B") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
