-- Issue #15: real token revocation. Each user gets a token_version counter,
-- bumped whenever their password changes (or tokens are otherwise revoked).
-- Extension tokens embed the version they were issued with; verifyExtToken
-- rejects a token whose embedded version no longer matches the user's
-- current token_version.
ALTER TABLE "users" ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 0;
