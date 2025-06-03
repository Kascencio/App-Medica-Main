/*
  Warnings:

  - Added the required column `auth` to the `PushSubscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `p256dh` to the `PushSubscription` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PermissionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "Permission" ADD COLUMN     "status" "PermissionStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "PushSubscription" ADD COLUMN     "auth" TEXT NOT NULL,
ADD COLUMN     "p256dh" TEXT NOT NULL;
