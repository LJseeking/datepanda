-- CreateEnum
CREATE TYPE "ResponseStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'INVALID');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('LIKE', 'PASS', 'UNLIKE', 'UNPASS');

-- CreateEnum
CREATE TYPE "ActionState" AS ENUM ('LIKE', 'PASS', 'NONE');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "PolicyAction" AS ENUM ('GET_RECOMMENDATIONS', 'GENERATE_RECOMMENDATIONS', 'SUBMIT_RESPONSE', 'GENERATE_PROFILE', 'SEND_MESSAGE', 'UPLOAD_AVATAR', 'BIND_PHONE');

-- CreateEnum
CREATE TYPE "RiskEventType" AS ENUM ('FAST_SUBMIT', 'INCONSISTENT', 'PATTERN', 'ACTION_RATE', 'ABUSE_GENERIC');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'RESOLVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "deletedAt" TIMESTAMP(3),
    "cityCode" TEXT,
    "schoolId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "cityCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolVerification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL,
    "method" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Response" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionnaireVersionId" TEXT NOT NULL,
    "status" "ResponseStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "durationSec" INTEGER,
    "deviceId" TEXT,
    "clientMeta" TEXT NOT NULL,
    "invalidatedAt" TIMESTAMP(3),
    "invalidReasonCodes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Response_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResponseItem" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "textValue" TEXT,
    "numericValue" INTEGER,

    CONSTRAINT "ResponseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResponseItemOption" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,

    CONSTRAINT "ResponseItemOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Option" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,

    CONSTRAINT "Option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserQuestionnaireState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionnaireVersionId" TEXT NOT NULL,
    "activeResponseId" TEXT,
    "submittedResponseId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserQuestionnaireState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "questionnaireVersionId" TEXT NOT NULL,
    "profileSpecVersionId" TEXT NOT NULL,
    "templateVersionId" TEXT NOT NULL,
    "policyChecksum" TEXT NOT NULL,
    "policySnapshot" TEXT NOT NULL,
    "profileSnapshot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyRecommendationBatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "algoVersion" TEXT NOT NULL,
    "policyChecksum" TEXT NOT NULL,
    "policySnapshot" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyRecommendationBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "proposerUserId" TEXT,
    "candidateUserId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "rank" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "kind" TEXT,
    "weekKey" TEXT,
    "round" TEXT,
    "reasonsJson" TEXT,
    "metaJson" TEXT,
    "seenAt" TIMESTAMP(3),
    "actedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unlock" (
    "id" TEXT NOT NULL,
    "pairKey" TEXT NOT NULL,

    CONSTRAINT "Unlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "pairKey" TEXT NOT NULL,
    "unlockId" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationMember" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "lastReadAt" TIMESTAMP(3),

    CONSTRAINT "ConversationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "clientMsgId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Block" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthOtp" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthOtp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "round" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "proposalId" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "metaJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "User_status_deletedAt_idx" ON "User"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "User_cityCode_schoolId_idx" ON "User"("cityCode", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolVerification_userId_key" ON "SchoolVerification"("userId");

-- CreateIndex
CREATE INDEX "SchoolVerification_schoolId_status_idx" ON "SchoolVerification"("schoolId", "status");

-- CreateIndex
CREATE INDEX "SchoolVerification_status_updatedAt_idx" ON "SchoolVerification"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "Response_userId_questionnaireVersionId_createdAt_idx" ON "Response"("userId", "questionnaireVersionId", "createdAt");

-- CreateIndex
CREATE INDEX "Response_questionnaireVersionId_status_createdAt_idx" ON "Response"("questionnaireVersionId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ResponseItem_responseId_idx" ON "ResponseItem"("responseId");

-- CreateIndex
CREATE UNIQUE INDEX "ResponseItem_responseId_questionId_key" ON "ResponseItem"("responseId", "questionId");

-- CreateIndex
CREATE INDEX "ResponseItemOption_responseId_questionId_idx" ON "ResponseItemOption"("responseId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "ResponseItemOption_responseId_questionId_optionId_key" ON "ResponseItemOption"("responseId", "questionId", "optionId");

-- CreateIndex
CREATE INDEX "UserQuestionnaireState_userId_updatedAt_idx" ON "UserQuestionnaireState"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserQuestionnaireState_userId_questionnaireVersionId_key" ON "UserQuestionnaireState"("userId", "questionnaireVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_responseId_key" ON "Profile"("responseId");

-- CreateIndex
CREATE INDEX "Profile_userId_createdAt_idx" ON "Profile"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DailyRecommendationBatch_dateKey_idx" ON "DailyRecommendationBatch"("dateKey");

-- CreateIndex
CREATE UNIQUE INDEX "DailyRecommendationBatch_userId_dateKey_key" ON "DailyRecommendationBatch"("userId", "dateKey");

-- CreateIndex
CREATE INDEX "Recommendation_batchId_rank_idx" ON "Recommendation"("batchId", "rank");

-- CreateIndex
CREATE INDEX "Recommendation_kind_weekKey_round_status_idx" ON "Recommendation"("kind", "weekKey", "round", "status");

-- CreateIndex
CREATE INDEX "Recommendation_kind_status_actedAt_idx" ON "Recommendation"("kind", "status", "actedAt");

-- CreateIndex
CREATE INDEX "Recommendation_proposerUserId_candidateUserId_kind_status_a_idx" ON "Recommendation"("proposerUserId", "candidateUserId", "kind", "status", "actedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Recommendation_batchId_candidateUserId_key" ON "Recommendation"("batchId", "candidateUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Recommendation_proposerUserId_kind_weekKey_round_key" ON "Recommendation"("proposerUserId", "kind", "weekKey", "round");

-- CreateIndex
CREATE UNIQUE INDEX "Unlock_pairKey_key" ON "Unlock"("pairKey");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_pairKey_key" ON "Conversation"("pairKey");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_unlockId_key" ON "Conversation"("unlockId");

-- CreateIndex
CREATE INDEX "Conversation_lastMessageAt_idx" ON "Conversation"("lastMessageAt");

-- CreateIndex
CREATE INDEX "ConversationMember_userId_lastReadAt_idx" ON "ConversationMember"("userId", "lastReadAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationMember_conversationId_userId_key" ON "ConversationMember"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_id_idx" ON "Message"("conversationId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Message_conversationId_clientMsgId_key" ON "Message"("conversationId", "clientMsgId");

-- CreateIndex
CREATE INDEX "Block_blockerId_createdAt_idx" ON "Block"("blockerId", "createdAt");

-- CreateIndex
CREATE INDEX "Block_blockedUserId_idx" ON "Block"("blockedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Block_blockerId_blockedUserId_key" ON "Block"("blockerId", "blockedUserId");

-- CreateIndex
CREATE INDEX "Report_targetUserId_status_createdAt_idx" ON "Report"("targetUserId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "AuthOtp_email_expiresAt_idx" ON "AuthOtp"("email", "expiresAt");

-- CreateIndex
CREATE INDEX "NotificationLog_weekKey_round_status_idx" ON "NotificationLog"("weekKey", "round", "status");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationLog_userId_weekKey_round_type_key" ON "NotificationLog"("userId", "weekKey", "round", "type");

-- AddForeignKey
ALTER TABLE "SchoolVerification" ADD CONSTRAINT "SchoolVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolVerification" ADD CONSTRAINT "SchoolVerification_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Response" ADD CONSTRAINT "Response_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponseItem" ADD CONSTRAINT "ResponseItem_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "Response"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponseItem" ADD CONSTRAINT "ResponseItem_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponseItemOption" ADD CONSTRAINT "ResponseItemOption_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "Response"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponseItemOption" ADD CONSTRAINT "ResponseItemOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponseItemOption" ADD CONSTRAINT "ResponseItemOption_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "Option"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Option" ADD CONSTRAINT "Option_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQuestionnaireState" ADD CONSTRAINT "UserQuestionnaireState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "Response"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyRecommendationBatch" ADD CONSTRAINT "DailyRecommendationBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "DailyRecommendationBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_candidateUserId_fkey" FOREIGN KEY ("candidateUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_unlockId_fkey" FOREIGN KEY ("unlockId") REFERENCES "Unlock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMember" ADD CONSTRAINT "ConversationMember_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMember" ADD CONSTRAINT "ConversationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_blockedUserId_fkey" FOREIGN KEY ("blockedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
