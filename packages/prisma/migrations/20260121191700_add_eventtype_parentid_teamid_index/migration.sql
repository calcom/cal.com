-- CreateIndex
CREATE INDEX CONCURRENTLY "EventType_parentId_teamId_idx" ON "public"."EventType"("parentId", "teamId");
