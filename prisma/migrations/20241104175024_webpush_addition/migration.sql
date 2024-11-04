-- CreateTable
CREATE TABLE "webpush" (
    "id" SERIAL NOT NULL,
    "data" JSONB NOT NULL,
    "timestamp" TIMESTAMPTZ NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "webpush_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "webpush_userId_idx" ON "webpush"("userId");

-- AddForeignKey
ALTER TABLE "webpush" ADD CONSTRAINT "webpush_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("username") ON DELETE RESTRICT ON UPDATE CASCADE;
