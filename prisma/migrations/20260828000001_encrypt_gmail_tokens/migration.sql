-- Rename columns to reflect that they now hold AES-256-GCM ciphertext, not
-- plaintext. Existing rows keep their (plaintext) values - app code treats a
-- value that fails to decrypt as legacy plaintext and re-encrypts it the
-- next time that row is written (OAuth reconnect or access-token refresh).
ALTER TABLE "gmail_tokens" RENAME COLUMN "access_token" TO "encrypted_access_token";
ALTER TABLE "gmail_tokens" RENAME COLUMN "refresh_token" TO "encrypted_refresh_token";
