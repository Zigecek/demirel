-- CreateEnum
CREATE TYPE "MqttValueType" AS ENUM ('FLOAT', 'BOOLEAN', 'STRING');

-- CreateTable
CREATE TABLE "session" (
    "sid" VARCHAR NOT NULL,
    "sess" JSON NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);

-- CreateTable
CREATE TABLE "user" (
    "username" VARCHAR(255) NOT NULL,
    "password" VARCHAR NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("username")
);

-- CreateTable
CREATE TABLE "mqtt" (
    "id" SERIAL NOT NULL,
    "topic" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "valueType" "MqttValueType" NOT NULL DEFAULT 'STRING',

    CONSTRAINT "mqtt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IDX_session_expire" ON "session"("expire");

-- CreateIndex
CREATE UNIQUE INDEX "username" ON "user"("username");

-- CreateIndex
CREATE INDEX "user_username_idx" ON "user"("username");

-- CreateIndex
CREATE INDEX "mqtt_topic_timestamp_idx" ON "mqtt"("topic", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "mqtt_topic_timestamp_key" ON "mqtt"("topic", "timestamp");

