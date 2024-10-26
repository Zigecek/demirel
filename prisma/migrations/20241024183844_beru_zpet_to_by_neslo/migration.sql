/*
  Warnings:

  - You are about to drop the column `aggregated` on the `mqtt` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "mqtt" DROP COLUMN "aggregated";
