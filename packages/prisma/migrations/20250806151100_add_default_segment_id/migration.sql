ALTER TABLE "UserFilterSegmentPreference"
ADD COLUMN "defaultSegmentId" VARCHAR(255) NULL;

ALTER TABLE "UserFilterSegmentPreference"
ADD CONSTRAINT "chk_one_segment_type" CHECK (
  ("segmentId" IS NOT NULL AND "defaultSegmentId" IS NULL) OR
  ("segmentId" IS NULL AND "defaultSegmentId" IS NOT NULL) OR
  ("segmentId" IS NULL AND "defaultSegmentId" IS NULL)
);

CREATE INDEX "UserFilterSegmentPreference_defaultSegmentId_idx"
ON "UserFilterSegmentPreference"("userId", "tableIdentifier", "defaultSegmentId");
