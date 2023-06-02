-- Sanitizing the DB before creating unique index
DELETE FROM "WorkflowsOnEventTypes"
 WHERE id not in
 (SELECT MIN(id)
 FROM "WorkflowsOnEventTypes"
 GROUP BY "workflowId", "eventTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowsOnEventTypes_workflowId_eventTypeId_key" ON "WorkflowsOnEventTypes"("workflowId", "eventTypeId");
