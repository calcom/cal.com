ALTER TABLE IF EXISTS "VerificationRequest" RENAME TO "VerificationToken";

-- RenameIndex
ALTER INDEX IF EXISTS "VerificationRequest_pkey" RENAME TO "VerificationToken_pkey";

-- RenameIndex
ALTER INDEX  IF EXISTS "VerificationRequest_token_key" RENAME TO "VerificationToken_token_key";

-- RenameIndex
ALTER INDEX IF EXISTS "VerificationRequest_identifier_token_key" RENAME TO "VerificationToken_identifier_token_key";
