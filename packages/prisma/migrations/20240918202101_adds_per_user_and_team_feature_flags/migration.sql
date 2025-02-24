-- CreateTable
CREATE TABLE "UserFeatures" (
    "userId" INTEGER NOT NULL,
    "featureId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserFeatures_pkey" PRIMARY KEY ("userId","featureId")
);

-- CreateTable
CREATE TABLE "TeamFeatures" (
    "teamId" INTEGER NOT NULL,
    "featureId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamFeatures_pkey" PRIMARY KEY ("teamId","featureId")
);

-- AddForeignKey
ALTER TABLE "UserFeatures" ADD CONSTRAINT "UserFeatures_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFeatures" ADD CONSTRAINT "UserFeatures_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamFeatures" ADD CONSTRAINT "TeamFeatures_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamFeatures" ADD CONSTRAINT "TeamFeatures_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("slug") ON DELETE CASCADE ON UPDATE CASCADE;
