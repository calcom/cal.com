-- CreateTable
CREATE TABLE "App_RoutingForms_Router" (
    "id" TEXT NOT NULL,
    "description" TEXT,
    "routes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "fields" JSONB,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "App_RoutingForms_Router_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "App_RoutingForms_Router" ADD CONSTRAINT "App_RoutingForms_Router_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
