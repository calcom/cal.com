-- Seed AbuseScoringConfig singleton (matches current hardcoded constants)
INSERT INTO "public"."AbuseScoringConfig" ("id", "alertThreshold", "lockThreshold", "monitoringWindowDays", "createdAt", "updatedAt")
VALUES (1, 50, 80, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
