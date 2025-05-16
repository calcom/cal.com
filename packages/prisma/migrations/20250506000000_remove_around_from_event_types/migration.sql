-- Update EventType locations to remove around_video integration
UPDATE "EventType"
SET "locations" = (
  SELECT jsonb_agg(location)
  FROM jsonb_array_elements("locations") AS location
  WHERE location->>'type' != 'integrations:around_video'
)
WHERE "locations" @> '[{"type": "integrations:around_video"}]'; 
