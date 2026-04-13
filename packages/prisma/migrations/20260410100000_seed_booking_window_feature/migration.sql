INSERT INTO "Feature" ("slug", "enabled", "type", "description", "createdAt", "updatedAt")
VALUES
  ('booking-window', false, 'OPERATIONAL', 'Routes booking reads through the smaller BookingWindow table for improved performance. Enable per-team via TeamFeatures.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
