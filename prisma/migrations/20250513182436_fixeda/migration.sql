/*
  Warnings:

  - Added the required column `age` to the `PatientProfile` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PatientProfile" ADD COLUMN     "age" INTEGER NOT NULL;
