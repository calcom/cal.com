INSERT INTO "Experiment" ("slug", "label", "description", "status", "createdAt", "updatedAt")
VALUES ('teams-banner-title', 'Teams Banner Title', 'Show "Use Cal with your team" instead of "Automatically route meetings to your team" on the /teams upgrade banner', 'DRAFT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "ExperimentVariant" ("experimentSlug", "variantSlug", "label", "weight")
VALUES ('teams-banner-title', 'use_cal', 'Use Cal with your team', 0)
ON CONFLICT ("experimentSlug", "variantSlug") DO NOTHING;
