ALTER TABLE "users" ALTER COLUMN "student_number" TYPE TEXT;
ALTER TABLE "users" ADD COLUMN "student_number_hash" VARCHAR(255);

ALTER TABLE "pre_signup_verifications" ALTER COLUMN "student_number" TYPE TEXT;
ALTER TABLE "pre_signup_verifications" ADD COLUMN "student_number_hash" VARCHAR(255);

CREATE UNIQUE INDEX "users_student_number_hash_key" ON "users"("student_number_hash");
CREATE INDEX "pre_signup_verifications_student_number_hash_idx" ON "pre_signup_verifications"("student_number_hash");
