-- CreateEnum
CREATE TYPE "support_inquiry_status" AS ENUM ('received', 'in_review', 'answered');

-- CreateTable
CREATE TABLE "support_inquiries" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "category" VARCHAR(50) NOT NULL,
    "screen" VARCHAR(50) NOT NULL,
    "title" VARCHAR(60) NOT NULL,
    "content" TEXT NOT NULL,
    "email" VARCHAR(80),
    "status" "support_inquiry_status" NOT NULL DEFAULT 'received',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "support_inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "support_inquiries_user_id_created_at_idx" ON "support_inquiries"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "support_inquiries_status_idx" ON "support_inquiries"("status");

-- AddForeignKey
ALTER TABLE "support_inquiries" ADD CONSTRAINT "support_inquiries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
