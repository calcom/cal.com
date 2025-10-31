-- Backfill CalVideoSettings no-show flags based on existing automations

-- Webhooks: enable hosts flag when AFTER_HOSTS_CAL_VIDEO_NO_SHOW is configured and active
UPDATE "CalVideoSettings" AS cvs
SET "enableAutomaticNoShowTrackingForHosts" = true
FROM "Webhook" w
WHERE w."eventTypeId" = cvs."eventTypeId"
  AND w."active" = true
  AND 'AFTER_HOSTS_CAL_VIDEO_NO_SHOW' = ANY (w."eventTriggers");

-- Webhooks: enable guests flag when AFTER_GUESTS_CAL_VIDEO_NO_SHOW is configured and active
UPDATE "CalVideoSettings" AS cvs
SET "enableAutomaticNoShowTrackingForGuests" = true
FROM "Webhook" w
WHERE w."eventTypeId" = cvs."eventTypeId"
  AND w."active" = true
  AND 'AFTER_GUESTS_CAL_VIDEO_NO_SHOW' = ANY (w."eventTriggers");

-- Workflows: enable hosts flag for workflows attached to the event type
UPDATE "CalVideoSettings" AS cvs
SET "enableAutomaticNoShowTrackingForHosts" = true
FROM "WorkflowsOnEventTypes" woe
JOIN "Workflow" wf ON wf."id" = woe."workflowId"
WHERE woe."eventTypeId" = cvs."eventTypeId"
  AND wf."trigger" = 'AFTER_HOSTS_CAL_VIDEO_NO_SHOW';

-- Workflows: enable guests flag for workflows attached to the event type
UPDATE "CalVideoSettings" AS cvs
SET "enableAutomaticNoShowTrackingForGuests" = true
FROM "WorkflowsOnEventTypes" woe
JOIN "Workflow" wf ON wf."id" = woe."workflowId"
WHERE woe."eventTypeId" = cvs."eventTypeId"
  AND wf."trigger" = 'AFTER_GUESTS_CAL_VIDEO_NO_SHOW';


