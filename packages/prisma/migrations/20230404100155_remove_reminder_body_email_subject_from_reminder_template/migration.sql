-- Until now reminderBody and emailSubject were ignored for the REMINDER template
-- From now on we use the reminderBody and emailSubject also for templates

UPDATE "WorkflowStep"
SET "reminderBody" = NULL, "emailSubject" = NULL
WHERE "template" = 'REMINDER';
