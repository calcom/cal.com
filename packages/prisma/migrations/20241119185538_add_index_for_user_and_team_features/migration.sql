-- CreateIndex
CREATE INDEX "TeamFeatures_teamId_featureId_idx" ON "TeamFeatures"("teamId", "featureId");

-- CreateIndex
CREATE INDEX "UserFeatures_userId_featureId_idx" ON "UserFeatures"("userId", "featureId");
