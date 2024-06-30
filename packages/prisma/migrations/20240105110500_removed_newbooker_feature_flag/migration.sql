-- Removes the feature flag for the new booker layouts which is no longer needed
DELETE FROM "Feature"
WHERE
  slug = 'booker-layouts';
