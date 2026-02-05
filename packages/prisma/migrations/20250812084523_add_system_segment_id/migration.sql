-- AlterTable
ALTER TABLE "UserFilterSegmentPreference" ADD COLUMN "systemSegmentId" TEXT,
ALTER COLUMN "segmentId" DROP NOT NULL;

-- Add an XOR CHECK constraint between segmentId and systemSegmentId
ALTER TABLE "UserFilterSegmentPreference"
  ADD CONSTRAINT "UserFilterSegmentPreference_segment_xor_system_chk"
  CHECK (
    (("segmentId" IS NOT NULL AND "systemSegmentId" IS NULL)
     OR ("segmentId" IS NULL AND "systemSegmentId" IS NOT NULL))
  ),
  ADD CONSTRAINT "UserFilterSegmentPreference_systemSegmentId_nonempty_chk"
  CHECK ("systemSegmentId" IS NULL OR length("systemSegmentId") > 0);
