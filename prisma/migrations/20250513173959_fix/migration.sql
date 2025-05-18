/*
  Warnings:

  - Added the required column `type` to the `Medication` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Medication" ADD COLUMN     "type" TEXT NOT NULL;
