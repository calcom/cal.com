INSERT INTO "Feature" ("slug", "enabled", "type", "description", "createdAt", "updatedAt")
VALUES
  ('enable-fuzzy-domain-matching', false, 'OPERATIONAL', 'Cross-TLD fuzzy domain matching for Salesforce account resolution. When enabled, email domains like acme.co.uk will match Salesforce Accounts with Website acme.com by comparing base domains.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
