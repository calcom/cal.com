-- CreateTable
CREATE TABLE "App_RoutingForms_QueuedFormResponse" (
    "id" SERIAL NOT NULL,
    "formId" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "chosenRouteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "App_RoutingForms_QueuedFormResponse_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "App_RoutingForms_QueuedFormResponse" ADD CONSTRAINT "App_RoutingForms_QueuedFormResponse_formId_fkey" FOREIGN KEY ("formId") REFERENCES "App_RoutingForms_Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;
