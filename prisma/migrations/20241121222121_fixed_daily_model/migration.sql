/*
  Warnings:

  - Added the required column `valueType` to the `daily` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "daily" ADD COLUMN     "valueType" "MqttValueType" NOT NULL;
