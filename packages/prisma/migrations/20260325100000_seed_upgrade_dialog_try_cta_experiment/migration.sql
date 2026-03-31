INSERT INTO "Experiment" ("slug", "label", "description", "status", "createdAt", "updatedAt")
VALUES ('upgrade-dialog-try-cta', 'Upgrade Dialog Try CTA', 'Replace "Upgrade to Teams/Orgs" with "Try Teams/Orgs" in the upgrade dialog', 'DRAFT', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "ExperimentVariant" ("experimentSlug", "variantSlug", "label", "weight")
VALUES ('upgrade-dialog-try-cta', 'try_cta', 'Try CTA', 0)
ON CONFLICT ("experimentSlug", "variantSlug") DO NOTHING;
