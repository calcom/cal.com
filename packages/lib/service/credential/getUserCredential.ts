import logger from "@calcom/lib/logger";

const log = logger.getSubLogger({ prefix: ["getCredential"] });

export const getUserCredential = ({
  userId,
  delegationCredentialId,
  credentialId,
}: {
  userId: number | null;
  delegationCredentialId: string | null;
  credentialId: number | null;
}):
  | {
      type: "delegation";
      userId: number;
      delegationCredentialId: string;
    }
  | {
      type: "credential";
      userId: number | null;
      credentialId: number;
    }
  | null => {
  if (delegationCredentialId) {
    if (!userId) {
      log.error(`DelegationCredential: userId is invalid: ${userId}`);
      return null;
    }
    return {
      type: "delegation",
      userId,
      delegationCredentialId,
    };
  }

  if (credentialId) {
    if (credentialId <= 0) {
      log.error(`Regular Credential: credentialId is invalid: ${credentialId}`);
      return null;
    }
    return {
      type: "credential",
      userId,
      credentialId,
    };
  }

  log.error("No credentialId or delegationCredentialId provided");
  return null;
};
