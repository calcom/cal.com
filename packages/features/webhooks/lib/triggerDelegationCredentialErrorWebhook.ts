import logger from "@calcom/lib/logger";

const log = logger.getSubLogger({ prefix: ["triggerDelegationCredentialErrorWebhook"] });

export async function triggerDelegationCredentialErrorWebhook(_params: {
  error: Error;
  credential: { id: number; type: string; appId: string | null };
  user: { id: number; email: string };
  delegationCredentialId: string;
}): Promise<void> {
  log.debug("Delegation credential webhooks are not available in community edition");
}
