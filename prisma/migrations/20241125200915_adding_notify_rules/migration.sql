-- CreateEnum
CREATE TYPE "ruleSeverity" AS ENUM ('INFO', 'WARNING', 'SERIOUS');

-- CreateTable
CREATE TABLE "rule" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "severity" "ruleSeverity" NOT NULL DEFAULT 'INFO',
    "conditions" TEXT[],
    "topics" TEXT[],

    CONSTRAINT "rule_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "rule" ADD CONSTRAINT "rule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("username") ON DELETE RESTRICT ON UPDATE CASCADE;
