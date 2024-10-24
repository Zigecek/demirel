/*
  Warnings:

  - Changed the type of `timestamp` on the `mqtt` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
-- 1. Přidání nového sloupce
-- Změna typu sloupce "timestamp" z BIGINT na TIMESTAMPTZ
ALTER TABLE "mqtt"
ALTER COLUMN "timestamp" TYPE TIMESTAMPTZ USING to_timestamp("timestamp" / 1000.0) AT TIME ZONE 'UTC';

-- Vytvoření indexu
CREATE INDEX IF NOT EXISTS "mqtt_topic_timestamp_idx" ON "mqtt"("topic", "timestamp");


-- Vytvoření unikátního indexu
CREATE UNIQUE INDEX IF NOT EXISTS "mqtt_topic_timestamp_key" ON "mqtt"("topic", "timestamp");
