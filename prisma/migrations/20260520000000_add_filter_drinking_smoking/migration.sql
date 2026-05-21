-- AlterTable
ALTER TABLE "recommendation_settings"
  ADD COLUMN "filter_drinking" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "filter_smoking"  BOOLEAN NOT NULL DEFAULT false;
