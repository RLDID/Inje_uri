-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('active', 'inactive', 'banned', 'withdrawn');

-- CreateEnum
CREATE TYPE "email_verification_status" AS ENUM ('pending', 'verified', 'expired');

-- CreateEnum
CREATE TYPE "interest_status" AS ENUM ('pending', 'accepted', 'declined', 'expired');

-- CreateEnum
CREATE TYPE "chat_room_status" AS ENUM ('active', 'expired', 'blocked', 'closed');

-- CreateEnum
CREATE TYPE "message_type" AS ENUM ('text', 'image', 'system');

-- CreateEnum
CREATE TYPE "feed_status" AS ENUM ('active', 'expired', 'deleted', 'hidden');

-- CreateEnum
CREATE TYPE "report_status" AS ENUM ('pending', 'reviewed', 'actioned', 'dismissed');

-- CreateEnum
CREATE TYPE "job_status" AS ENUM ('running', 'success', 'failed');

-- CreateEnum
CREATE TYPE "chat_room_source_type" AS ENUM ('interest', 'comment');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "login_id" VARCHAR(100),
    "real_name" VARCHAR(255) NOT NULL,
    "age" INTEGER,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "birth" VARCHAR(6),
    "birth_hash" VARCHAR(255),
    "nickname" VARCHAR(50) NOT NULL,
    "gender" VARCHAR(50) NOT NULL,
    "phone_number" VARCHAR(30),
    "nationality" VARCHAR(10) NOT NULL DEFAULT 'KR',
    "university" VARCHAR(100) NOT NULL,
    "department" VARCHAR(100) NOT NULL,
    "student_year" INTEGER NOT NULL,
    "student_number" VARCHAR(30),
    "bio" VARCHAR(500),
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "status" "user_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_active_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "last_seen_at" TIMESTAMPTZ(6),

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pre_signup_verifications" (
    "token_hash" VARCHAR(255) NOT NULL,
    "student_number" VARCHAR(30) NOT NULL,
    "birth_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pre_signup_verifications_pkey" PRIMARY KEY ("token_hash")
);

-- CreateTable
CREATE TABLE "email_verifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "school_email" VARCHAR(255) NOT NULL,
    "code_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "verified_at" TIMESTAMPTZ(6),
    "status" "email_verification_status" NOT NULL DEFAULT 'pending',

    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profile_images" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "image_url" VARCHAR(2048) NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_profile_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "category_id" SERIAL NOT NULL,
    "category_code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "selection_type" VARCHAR(20) NOT NULL,
    "max_select_count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "keyword" (
    "keyword_id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "keyword_code" VARCHAR(100) NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "keyword_pkey" PRIMARY KEY ("keyword_id")
);

-- CreateTable
CREATE TABLE "user_keyword_selections" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "keyword_id" INTEGER NOT NULL,

    CONSTRAINT "user_keyword_selections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_settings" (
    "user_id" INTEGER NOT NULL,
    "exclude_same_department" BOOLEAN NOT NULL DEFAULT false,
    "reduce_same_year" BOOLEAN NOT NULL DEFAULT false,
    "preferred_age_min" INTEGER,
    "preferred_age_max" INTEGER,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendation_settings_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "daily_recommendations" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "recommendation_date" DATE NOT NULL,
    "selected_candidate_user_id" INTEGER,
    "selected_at" TIMESTAMPTZ(6),
    "generated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_recommendation_items" (
    "id" SERIAL NOT NULL,
    "daily_recommendation_id" INTEGER NOT NULL,
    "candidate_user_id" INTEGER NOT NULL,
    "rank_order" INTEGER NOT NULL,
    "passed_at" TIMESTAMPTZ(6),

    CONSTRAINT "daily_recommendation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interests" (
    "id" SERIAL NOT NULL,
    "from_user_id" INTEGER NOT NULL,
    "to_user_id" INTEGER NOT NULL,
    "status" "interest_status" NOT NULL DEFAULT 'pending',
    "matched_at" TIMESTAMPTZ(6),
    "declined_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),

    CONSTRAINT "interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_dismisses" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "dismissed_user_id" INTEGER NOT NULL,
    "daily_recommendation_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "recommendation_dismisses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_rooms" (
    "id" SERIAL NOT NULL,
    "source_type" "chat_room_source_type" NOT NULL,
    "created_by_user_id" INTEGER NOT NULL,
    "source_interest_id" INTEGER,
    "source_comment_id" INTEGER,
    "status" "chat_room_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "extended_once" BOOLEAN NOT NULL DEFAULT false,
    "blocked_by_user_id" INTEGER,

    CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_room_participants" (
    "id" SERIAL NOT NULL,
    "chat_room_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_read_at" TIMESTAMPTZ(6),
    "last_read_message_id" INTEGER,
    "left_at" TIMESTAMPTZ(6),

    CONSTRAINT "chat_room_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" SERIAL NOT NULL,
    "chat_room_id" INTEGER NOT NULL,
    "sender_user_id" INTEGER NOT NULL,
    "type" "message_type" NOT NULL DEFAULT 'text',
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "self_date_feeds" (
    "id" SERIAL NOT NULL,
    "author_user_id" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "status" "feed_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "boost_score" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "self_date_feeds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "self_date_feed_images" (
    "id" SERIAL NOT NULL,
    "feed_id" INTEGER NOT NULL,
    "image_url" VARCHAR(2048) NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "self_date_feed_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_keywords" (
    "feed_keyword_id" SERIAL NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "feed_keywords_pkey" PRIMARY KEY ("feed_keyword_id")
);

-- CreateTable
CREATE TABLE "self_date_feed_keywords" (
    "id" SERIAL NOT NULL,
    "feed_id" INTEGER NOT NULL,
    "feed_keyword_id" INTEGER NOT NULL,

    CONSTRAINT "self_date_feed_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_comments" (
    "id" SERIAL NOT NULL,
    "feed_id" INTEGER NOT NULL,
    "commenter_user_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "feed_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_views" (
    "id" SERIAL NOT NULL,
    "feed_id" INTEGER NOT NULL,
    "viewer_user_id" INTEGER NOT NULL,
    "viewed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocks" (
    "id" SERIAL NOT NULL,
    "blocker_user_id" INTEGER NOT NULL,
    "blocked_user_id" INTEGER NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unblocked_at" TIMESTAMPTZ(6),

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" SERIAL NOT NULL,
    "reporter_user_id" INTEGER NOT NULL,
    "target_type" VARCHAR(50) NOT NULL,
    "target_id" INTEGER NOT NULL,
    "reason_type" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "status" "report_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMPTZ(6),

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phone_blocks" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "phone_number_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unblocked_at" TIMESTAMPTZ(6),

    CONSTRAINT "phone_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_job_runs" (
    "id" SERIAL NOT NULL,
    "job_name" VARCHAR(100) NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL,
    "ended_at" TIMESTAMPTZ(6),
    "status" "job_status" NOT NULL,
    "summary" TEXT,

    CONSTRAINT "internal_job_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "key" VARCHAR(100) NOT NULL,
    "value" VARCHAR(255) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "place_categories" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "place_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "places" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address" VARCHAR(255) NOT NULL,
    "image_url" VARCHAR(2048),
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "place_tags" (
    "id" SERIAL NOT NULL,
    "place_id" INTEGER NOT NULL,
    "tag" VARCHAR(100) NOT NULL,

    CONSTRAINT "place_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_room_place_suggestions" (
    "id" SERIAL NOT NULL,
    "chat_room_id" INTEGER NOT NULL,
    "place_id" INTEGER NOT NULL,
    "triggered_keyword" VARCHAR(100),
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "suggested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_room_place_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_contacts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "contact_name" VARCHAR(100),
    "phone_number_e164" VARCHAR(30) NOT NULL,
    "phone_number_hash" VARCHAR(255) NOT NULL,
    "matched_user_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_login_id_key" ON "users"("login_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_nickname_key" ON "users"("nickname");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_token_hash_key" ON "auth_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "pre_signup_verifications_expires_at_idx" ON "pre_signup_verifications"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_profile_images_user_id_sort_order_key" ON "user_profile_images"("user_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "categories_category_code_key" ON "categories"("category_code");

-- CreateIndex
CREATE UNIQUE INDEX "keyword_category_id_keyword_code_key" ON "keyword"("category_id", "keyword_code");

-- CreateIndex
CREATE UNIQUE INDEX "user_keyword_selections_user_id_keyword_id_key" ON "user_keyword_selections"("user_id", "keyword_id");

-- CreateIndex
CREATE UNIQUE INDEX "daily_recommendations_user_id_recommendation_date_key" ON "daily_recommendations"("user_id", "recommendation_date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_recommendation_items_daily_recommendation_id_candidat_key" ON "daily_recommendation_items"("daily_recommendation_id", "candidate_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "daily_recommendation_items_daily_recommendation_id_rank_ord_key" ON "daily_recommendation_items"("daily_recommendation_id", "rank_order");

-- CreateIndex
CREATE INDEX "interests_from_user_id_to_user_id_status_idx" ON "interests"("from_user_id", "to_user_id", "status");

-- CreateIndex
CREATE INDEX "interests_expires_at_idx" ON "interests"("expires_at");

-- CreateIndex
CREATE INDEX "recommendation_dismisses_expires_at_idx" ON "recommendation_dismisses"("expires_at");

-- CreateIndex
CREATE INDEX "recommendation_dismisses_user_id_expires_at_idx" ON "recommendation_dismisses"("user_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "recommendation_dismisses_user_id_dismissed_user_id_key" ON "recommendation_dismisses"("user_id", "dismissed_user_id");

-- CreateIndex
CREATE INDEX "chat_rooms_expires_at_idx" ON "chat_rooms"("expires_at");

-- CreateIndex
CREATE INDEX "chat_room_participants_user_id_chat_room_id_idx" ON "chat_room_participants"("user_id", "chat_room_id");

-- CreateIndex
CREATE INDEX "chat_room_participants_left_at_idx" ON "chat_room_participants"("left_at");

-- CreateIndex
CREATE UNIQUE INDEX "chat_room_participants_chat_room_id_user_id_key" ON "chat_room_participants"("chat_room_id", "user_id");

-- CreateIndex
CREATE INDEX "messages_chat_room_id_created_at_idx" ON "messages"("chat_room_id", "created_at");

-- CreateIndex
CREATE INDEX "self_date_feeds_expires_at_idx" ON "self_date_feeds"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "self_date_feed_images_feed_id_sort_order_key" ON "self_date_feed_images"("feed_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "feed_keywords_code_key" ON "feed_keywords"("code");

-- CreateIndex
CREATE UNIQUE INDEX "self_date_feed_keywords_feed_id_feed_keyword_id_key" ON "self_date_feed_keywords"("feed_id", "feed_keyword_id");

-- CreateIndex
CREATE UNIQUE INDEX "feed_comments_feed_id_commenter_user_id_key" ON "feed_comments"("feed_id", "commenter_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "feed_views_feed_id_viewer_user_id_key" ON "feed_views"("feed_id", "viewer_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "blocks_blocker_user_id_blocked_user_id_key" ON "blocks"("blocker_user_id", "blocked_user_id");

-- CreateIndex
CREATE INDEX "reports_target_type_target_id_idx" ON "reports"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "phone_blocks_phone_number_hash_idx" ON "phone_blocks"("phone_number_hash");

-- CreateIndex
CREATE UNIQUE INDEX "phone_blocks_user_id_phone_number_hash_key" ON "phone_blocks"("user_id", "phone_number_hash");

-- CreateIndex
CREATE INDEX "internal_job_runs_job_name_started_at_idx" ON "internal_job_runs"("job_name", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "place_categories_code_key" ON "place_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "place_tags_place_id_tag_key" ON "place_tags"("place_id", "tag");

-- CreateIndex
CREATE INDEX "user_contacts_matched_user_id_idx" ON "user_contacts"("matched_user_id");

-- CreateIndex
CREATE INDEX "user_contacts_user_id_matched_user_id_idx" ON "user_contacts"("user_id", "matched_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_contacts_user_id_phone_number_hash_key" ON "user_contacts"("user_id", "phone_number_hash");

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verifications" ADD CONSTRAINT "email_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_profile_images" ADD CONSTRAINT "user_profile_images_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keyword" ADD CONSTRAINT "keyword_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("category_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_keyword_selections" ADD CONSTRAINT "user_keyword_selections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_keyword_selections" ADD CONSTRAINT "user_keyword_selections_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("category_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_keyword_selections" ADD CONSTRAINT "user_keyword_selections_keyword_id_fkey" FOREIGN KEY ("keyword_id") REFERENCES "keyword"("keyword_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_settings" ADD CONSTRAINT "recommendation_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_recommendations" ADD CONSTRAINT "daily_recommendations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_recommendations" ADD CONSTRAINT "daily_recommendations_selected_candidate_user_id_fkey" FOREIGN KEY ("selected_candidate_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_recommendation_items" ADD CONSTRAINT "daily_recommendation_items_daily_recommendation_id_fkey" FOREIGN KEY ("daily_recommendation_id") REFERENCES "daily_recommendations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_recommendation_items" ADD CONSTRAINT "daily_recommendation_items_candidate_user_id_fkey" FOREIGN KEY ("candidate_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interests" ADD CONSTRAINT "interests_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interests" ADD CONSTRAINT "interests_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_dismisses" ADD CONSTRAINT "recommendation_dismisses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_dismisses" ADD CONSTRAINT "recommendation_dismisses_dismissed_user_id_fkey" FOREIGN KEY ("dismissed_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_dismisses" ADD CONSTRAINT "recommendation_dismisses_daily_recommendation_id_fkey" FOREIGN KEY ("daily_recommendation_id") REFERENCES "daily_recommendations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_source_interest_id_fkey" FOREIGN KEY ("source_interest_id") REFERENCES "interests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_source_comment_id_fkey" FOREIGN KEY ("source_comment_id") REFERENCES "feed_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_room_participants" ADD CONSTRAINT "chat_room_participants_chat_room_id_fkey" FOREIGN KEY ("chat_room_id") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_room_participants" ADD CONSTRAINT "chat_room_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_room_participants" ADD CONSTRAINT "chat_room_participants_last_read_message_id_fkey" FOREIGN KEY ("last_read_message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_chat_room_id_fkey" FOREIGN KEY ("chat_room_id") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "self_date_feeds" ADD CONSTRAINT "self_date_feeds_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "self_date_feed_images" ADD CONSTRAINT "self_date_feed_images_feed_id_fkey" FOREIGN KEY ("feed_id") REFERENCES "self_date_feeds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "self_date_feed_keywords" ADD CONSTRAINT "self_date_feed_keywords_feed_id_fkey" FOREIGN KEY ("feed_id") REFERENCES "self_date_feeds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "self_date_feed_keywords" ADD CONSTRAINT "self_date_feed_keywords_feed_keyword_id_fkey" FOREIGN KEY ("feed_keyword_id") REFERENCES "feed_keywords"("feed_keyword_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_comments" ADD CONSTRAINT "feed_comments_feed_id_fkey" FOREIGN KEY ("feed_id") REFERENCES "self_date_feeds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_comments" ADD CONSTRAINT "feed_comments_commenter_user_id_fkey" FOREIGN KEY ("commenter_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_views" ADD CONSTRAINT "feed_views_feed_id_fkey" FOREIGN KEY ("feed_id") REFERENCES "self_date_feeds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_views" ADD CONSTRAINT "feed_views_viewer_user_id_fkey" FOREIGN KEY ("viewer_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_user_id_fkey" FOREIGN KEY ("blocker_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_user_id_fkey" FOREIGN KEY ("blocked_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_user_id_fkey" FOREIGN KEY ("reporter_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phone_blocks" ADD CONSTRAINT "phone_blocks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "places" ADD CONSTRAINT "places_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "place_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_tags" ADD CONSTRAINT "place_tags_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_room_place_suggestions" ADD CONSTRAINT "chat_room_place_suggestions_chat_room_id_fkey" FOREIGN KEY ("chat_room_id") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_room_place_suggestions" ADD CONSTRAINT "chat_room_place_suggestions_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_contacts" ADD CONSTRAINT "user_contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_contacts" ADD CONSTRAINT "user_contacts_matched_user_id_fkey" FOREIGN KEY ("matched_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
