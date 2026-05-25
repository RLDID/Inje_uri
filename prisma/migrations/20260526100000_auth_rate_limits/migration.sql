CREATE TABLE "auth_rate_limits" (
    "id" SERIAL NOT NULL,
    "scope" VARCHAR(80) NOT NULL,
    "key_hash" VARCHAR(255) NOT NULL,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "window_started_at" TIMESTAMPTZ(6) NOT NULL,
    "last_failed_at" TIMESTAMPTZ(6),
    "blocked_until" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "auth_rate_limits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "auth_rate_limits_scope_key_hash_key" ON "auth_rate_limits"("scope", "key_hash");
CREATE INDEX "auth_rate_limits_blocked_until_idx" ON "auth_rate_limits"("blocked_until");
