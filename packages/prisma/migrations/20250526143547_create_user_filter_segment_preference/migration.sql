-- CreateTable
CREATE TABLE "UserFilterSegmentPreference" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tableIdentifier" TEXT NOT NULL,
    "segmentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserFilterSegmentPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserFilterSegmentPreference_userId_idx" ON "UserFilterSegmentPreference"("userId");

-- CreateIndex
CREATE INDEX "UserFilterSegmentPreference_segmentId_idx" ON "UserFilterSegmentPreference"("segmentId");

-- CreateIndex
CREATE UNIQUE INDEX "UserFilterSegmentPreference_userId_tableIdentifier_key" ON "UserFilterSegmentPreference"("userId", "tableIdentifier");

-- AddForeignKey
ALTER TABLE "UserFilterSegmentPreference" ADD CONSTRAINT "UserFilterSegmentPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFilterSegmentPreference" ADD CONSTRAINT "UserFilterSegmentPreference_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "FilterSegment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
