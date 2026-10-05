-- Issue #7: audit trail of integration connect/disconnect events, surfaced
-- in Settings -> Integrations.
CREATE TABLE "integration_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "detail" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "integration_events_user_id_created_at_idx" ON "integration_events"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "integration_events" ADD CONSTRAINT "integration_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
