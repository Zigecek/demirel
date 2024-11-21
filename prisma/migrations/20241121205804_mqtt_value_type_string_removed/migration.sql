/*
  Warnings:

  - The values [STRING] on the enum `MqttValueType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "MqttValueType_new" AS ENUM ('FLOAT', 'BOOLEAN');
ALTER TABLE "mqtt" ALTER COLUMN "valueType" DROP DEFAULT;
ALTER TABLE "mqtt" ALTER COLUMN "valueType" TYPE "MqttValueType_new" USING ("valueType"::text::"MqttValueType_new");
ALTER TYPE "MqttValueType" RENAME TO "MqttValueType_old";
ALTER TYPE "MqttValueType_new" RENAME TO "MqttValueType";
DROP TYPE "MqttValueType_old";
ALTER TABLE "mqtt" ALTER COLUMN "valueType" SET DEFAULT 'FLOAT';
COMMIT;

-- AlterTable
ALTER TABLE "mqtt" ALTER COLUMN "valueType" SET DEFAULT 'FLOAT';

-- CreateTable
CREATE TABLE "daily" (
    "id" SERIAL NOT NULL,
    "topic" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "max" DOUBLE PRECISION,
    "min" DOUBLE PRECISION,
    "avg" DOUBLE PRECISION,
    "count" INTEGER,
    "uptime" INTEGER,
    "downtime" INTEGER,

    CONSTRAINT "daily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_topic_date_idx" ON "daily"("topic", "date");
