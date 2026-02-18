/*
  Warnings:

  - Added the required column `updatedAt` to the `NotificationLog` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_NotificationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "round" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "sentAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "proposalId" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "metaJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_NotificationLog" ("createdAt", "id", "metaJson", "round", "sentAt", "status", "toEmail", "type", "userId", "weekKey") SELECT "createdAt", "id", "metaJson", "round", "sentAt", "status", "toEmail", "type", "userId", "weekKey" FROM "NotificationLog";
DROP TABLE "NotificationLog";
ALTER TABLE "new_NotificationLog" RENAME TO "NotificationLog";
CREATE INDEX "NotificationLog_weekKey_round_status_idx" ON "NotificationLog"("weekKey", "round", "status");
CREATE UNIQUE INDEX "NotificationLog_userId_weekKey_round_type_key" ON "NotificationLog"("userId", "weekKey", "round", "type");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
