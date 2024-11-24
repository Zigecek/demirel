-- CreateTable
CREATE TABLE "nickname" (
    "topic" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,

    CONSTRAINT "nickname_pkey" PRIMARY KEY ("topic")
);

-- CreateIndex
CREATE UNIQUE INDEX "topic" ON "nickname"("topic");

-- CreateIndex
CREATE INDEX "nickname_topic_idx" ON "nickname"("topic");
