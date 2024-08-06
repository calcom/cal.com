-- CreateTable
CREATE TABLE "NotificationsSubscriptions" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "subscription" TEXT NOT NULL,

    CONSTRAINT "NotificationsSubscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationsSubscriptions_userId_subscription_idx" ON "NotificationsSubscriptions"("userId", "subscription");

-- AddForeignKey
ALTER TABLE "NotificationsSubscriptions" ADD CONSTRAINT "NotificationsSubscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
