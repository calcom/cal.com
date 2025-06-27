-- CreateTable
CREATE TABLE "App_RoutingForms_QueuedFormResponse" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "chosenRouteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "actualResponseId" INTEGER,

    CONSTRAINT "App_RoutingForms_QueuedFormResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "App_RoutingForms_QueuedFormResponse_actualResponseId_key" ON "App_RoutingForms_QueuedFormResponse"("actualResponseId");

-- AddForeignKey
ALTER TABLE "App_RoutingForms_QueuedFormResponse" ADD CONSTRAINT "App_RoutingForms_QueuedFormResponse_formId_fkey" FOREIGN KEY ("formId") REFERENCES "App_RoutingForms_Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "App_RoutingForms_QueuedFormResponse" ADD CONSTRAINT "App_RoutingForms_QueuedFormResponse_actualResponseId_fkey" FOREIGN KEY ("actualResponseId") REFERENCES "App_RoutingForms_FormResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
