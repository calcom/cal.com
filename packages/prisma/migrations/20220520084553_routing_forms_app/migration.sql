-- CreateTable
CREATE TABLE "App_RoutingForms_Form" (
    "id" SERIAL NOT NULL,
    "route" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "App_RoutingForms_Form_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "App_RoutingForms_FormResponse" (
    "id" SERIAL NOT NULL,
    "formFillerId" TEXT NOT NULL,
    "formId" INTEGER NOT NULL,
    "response" JSONB NOT NULL,

    CONSTRAINT "App_RoutingForms_FormResponse_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "App_RoutingForms_Form" ADD CONSTRAINT "App_RoutingForms_Form_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "App_RoutingForms_FormResponse" ADD CONSTRAINT "App_RoutingForms_FormResponse_formId_fkey" FOREIGN KEY ("formId") REFERENCES "App_RoutingForms_Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;
