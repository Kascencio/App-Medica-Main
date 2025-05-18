/*
  Warnings:

  - You are about to drop the column `address` on the `PatientProfile` table. All the data in the column will be lost.
  - You are about to drop the column `emergencyContact` on the `PatientProfile` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `PatientProfile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PatientProfile" DROP COLUMN "address",
DROP COLUMN "emergencyContact",
DROP COLUMN "phone";
