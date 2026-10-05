-- Issue #20: tracks whether the 24h-ahead interview reminder cron has
-- already fired for a job's current interviewDate, so it isn't sent twice.
ALTER TABLE "jobs" ADD COLUMN "interview_reminder_sent_at" TIMESTAMP(3);
