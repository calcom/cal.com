-- CreateTable
CREATE TABLE "public"."ApiCallLog" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "queryParams" JSONB,
    "requestHeaders" JSONB,
    "requestBody" JSONB,
    "statusCode" INTEGER NOT NULL,
    "responseBody" JSONB,
    "responseHeaders" JSONB,
    "responseTime" INTEGER NOT NULL,
    "userId" INTEGER,
    "organizationId" INTEGER,
    "oauthClientId" TEXT,
    "isError" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "errorStack" TEXT,
    "errorCode" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "ipAddress" TEXT,

    CONSTRAINT "ApiCallLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiCallLog_requestId_key" ON "public"."ApiCallLog"("requestId");

-- CreateIndex
CREATE INDEX "ApiCallLog_userId_timestamp_idx" ON "public"."ApiCallLog"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "ApiCallLog_organizationId_timestamp_idx" ON "public"."ApiCallLog"("organizationId", "timestamp");

-- CreateIndex
CREATE INDEX "ApiCallLog_oauthClientId_timestamp_idx" ON "public"."ApiCallLog"("oauthClientId", "timestamp");

-- CreateIndex
CREATE INDEX "ApiCallLog_endpoint_timestamp_idx" ON "public"."ApiCallLog"("endpoint", "timestamp");

-- CreateIndex
CREATE INDEX "ApiCallLog_isError_timestamp_idx" ON "public"."ApiCallLog"("isError", "timestamp");

-- CreateIndex
CREATE INDEX "ApiCallLog_statusCode_timestamp_idx" ON "public"."ApiCallLog"("statusCode", "timestamp");

-- CreateIndex
CREATE INDEX "ApiCallLog_timestamp_idx" ON "public"."ApiCallLog"("timestamp");

-- AddForeignKey
ALTER TABLE "public"."ApiCallLog" ADD CONSTRAINT "ApiCallLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApiCallLog" ADD CONSTRAINT "ApiCallLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApiCallLog" ADD CONSTRAINT "ApiCallLog_oauthClientId_fkey" FOREIGN KEY ("oauthClientId") REFERENCES "public"."PlatformOAuthClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
