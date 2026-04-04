-- CreateIndex
CREATE INDEX IF NOT EXISTS "App_RoutingForms_FormResponse_formId_createdAt_idx" ON "App_RoutingForms_FormResponse"("formId", "createdAt");
