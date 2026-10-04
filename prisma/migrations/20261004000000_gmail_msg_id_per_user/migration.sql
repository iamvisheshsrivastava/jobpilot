-- Gmail message IDs are only unique within a single mailbox, not globally,
-- so a global unique constraint on gmail_msg_id could in principle collide
-- across two different users' inboxes (issue #23). Rescope it to be unique
-- per-user instead.

-- DropIndex
DROP INDEX "notifications_gmail_msg_id_key";

-- CreateIndex
CREATE UNIQUE INDEX "notifications_user_id_gmail_msg_id_key" ON "notifications"("user_id", "gmail_msg_id");
