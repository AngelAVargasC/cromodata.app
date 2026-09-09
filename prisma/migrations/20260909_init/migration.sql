-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthRecord" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ageRange" TEXT NOT NULL,
    "conditions" TEXT NOT NULL,
    "familyHistory" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "sleep" TEXT NOT NULL,
    "checkup" TEXT NOT NULL,
    "stress" TEXT NOT NULL,
    "health" TEXT NOT NULL,
    "tobacco" TEXT,
    "ultraprocessed" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HealthRecord_token_key" ON "HealthRecord"("token");

