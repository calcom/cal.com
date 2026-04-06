-- CreateIndex
CREATE INDEX "AccessToken_platformOAuthClientId_expiresAt_idx" ON "AccessToken"("platformOAuthClientId", "expiresAt");
