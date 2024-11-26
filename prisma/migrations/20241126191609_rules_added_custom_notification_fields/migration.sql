/*
  Warnings:

  - Added the required column `notificationBody` to the `rule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `notificationTitle` to the `rule` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "rule" ADD COLUMN     "notificationBody" TEXT NOT NULL,
ADD COLUMN     "notificationTitle" TEXT NOT NULL;
