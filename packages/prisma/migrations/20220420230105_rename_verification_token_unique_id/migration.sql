-- RenameIndex
ALTER INDEX IF EXISTS "VerificationRequest.identifier_token_unique" RENAME TO "VerificationToken_identifier_token_key";

-- RenameIndex
ALTER INDEX IF EXISTS "VerificationRequest.token_unique" RENAME TO "VerificationToken_token_key";
