-- CreateTable
CREATE TABLE "CaregiverInvite" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "patientProfileId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaregiverInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CaregiverInvite_code_key" ON "CaregiverInvite"("code");

-- CreateIndex
CREATE INDEX "CaregiverInvite_patientProfileId_idx" ON "CaregiverInvite"("patientProfileId");

-- AddForeignKey
ALTER TABLE "CaregiverInvite" ADD CONSTRAINT "CaregiverInvite_patientProfileId_fkey" FOREIGN KEY ("patientProfileId") REFERENCES "PatientProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
