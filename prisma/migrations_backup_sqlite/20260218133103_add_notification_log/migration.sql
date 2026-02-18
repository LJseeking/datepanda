-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "round" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "metaJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "NotificationLog_weekKey_round_status_idx" ON "NotificationLog"("weekKey", "round", "status");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationLog_userId_weekKey_round_type_key" ON "NotificationLog"("userId", "weekKey", "round", "type");
