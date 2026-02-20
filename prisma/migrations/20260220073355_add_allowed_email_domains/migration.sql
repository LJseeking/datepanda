/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `School` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "School" ADD COLUMN     "isEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "AllowedEmailDomain" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "emailType" TEXT NOT NULL DEFAULT 'student',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AllowedEmailDomain_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AllowedEmailDomain_domain_key" ON "AllowedEmailDomain"("domain");

-- CreateIndex
CREATE INDEX "AllowedEmailDomain_domain_isEnabled_idx" ON "AllowedEmailDomain"("domain", "isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "School_name_key" ON "School"("name");

-- AddForeignKey
ALTER TABLE "AllowedEmailDomain" ADD CONSTRAINT "AllowedEmailDomain_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
