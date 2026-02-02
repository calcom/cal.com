-- CreateIndex
CREATE INDEX "EventType_parentId_teamId_idx" ON "public"."EventType"("parentId", "teamId");
