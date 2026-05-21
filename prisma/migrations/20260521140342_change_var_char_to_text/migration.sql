-- AlterTable
ALTER TABLE "user_contacts" ALTER COLUMN "contact_name" SET DATA TYPE TEXT,
ALTER COLUMN "phone_number_e164" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "real_name" SET DATA TYPE TEXT,
ALTER COLUMN "birth" SET DATA TYPE TEXT;
