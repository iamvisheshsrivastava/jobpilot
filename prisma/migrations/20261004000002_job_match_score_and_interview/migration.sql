-- Issue #21: persist the AI-computed suitability/match score on the job
-- itself instead of only returning it from /api/suitability.
-- Issue #20: interview scheduling fields.
ALTER TABLE "jobs" ADD COLUMN "match_score" INTEGER;
ALTER TABLE "jobs" ADD COLUMN "match_verdict" TEXT;
ALTER TABLE "jobs" ADD COLUMN "matched_at" TIMESTAMP(3);
ALTER TABLE "jobs" ADD COLUMN "interview_date" TIMESTAMP(3);
ALTER TABLE "jobs" ADD COLUMN "interview_type" TEXT;
ALTER TABLE "jobs" ADD COLUMN "interview_location" TEXT;
