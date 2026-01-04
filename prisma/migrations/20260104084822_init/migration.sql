-- CreateEnum
CREATE TYPE "Role" AS ENUM ('Citizen', 'NGO');

-- CreateEnum
CREATE TYPE "CaseType" AS ENUM ('INJURED', 'NEWBORN', 'EMERGENCY', 'ADOPTION');

-- CreateEnum
CREATE TYPE "CaseSeverity" AS ENUM ('Critical', 'Urgent', 'Moderate', 'Low');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('Reported', 'InProgress', 'Resolved', 'Closed');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NGO" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "NGO_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Case" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "CaseType" NOT NULL,
    "severity" "CaseSeverity",
    "status" "CaseStatus" NOT NULL DEFAULT 'Reported',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "animalType" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "animalCount" INTEGER,
    "reportedById" TEXT NOT NULL,
    "assignedNgoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "NGO_userId_key" ON "NGO"("userId");

-- AddForeignKey
ALTER TABLE "NGO" ADD CONSTRAINT "NGO_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Case" ADD CONSTRAINT "Case_assignedNgoId_fkey" FOREIGN KEY ("assignedNgoId") REFERENCES "NGO"("id") ON DELETE SET NULL ON UPDATE CASCADE;
