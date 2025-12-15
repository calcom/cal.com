import { DelegationCredentialRepository } from "@calcom/features/delegation-credentials/repositories/DelegationCredentialRepository";
import { DelegationCredentialErrorPayloadType } from "@calcom/features/webhooks/lib/dto/types";
import type { CalendarAppDelegationCredentialError } from "@calcom/lib/CalendarAppError";
import logger from "@calcom/lib/logger";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import { WebhookRepository } from "./repository/WebhookRepository";
import sendPayload from "./sendPayload";

const log = logger.getSubLogger({ prefix: ["triggerDelegationCredentialErrorWebhook"] });

/**
 * Triggers delegation credential error webhooks for organization webhooks subscribed to DELEGATION_CREDENTIAL_ERROR
 */
export async function triggerDelegationCredentialErrorWebhook(params: {
  error: CalendarAppDelegationCredentialError;
  credential: DelegationCredentialErrorPayloadType["credential"];
  user: DelegationCredentialErrorPayloadType["user"];
  delegationCredentialId: string;
}): Promise<void> {
  try {
    const { error, credential, user, delegationCredentialId } = params;

    const delegationCredential = await DelegationCredentialRepository.findById({
      id: delegationCredentialId,
    });

    if (!delegationCredential) {
      log.debug("No delegation credential found", { delegationCredentialId });
      return;
    }

    const webhookRepository = WebhookRepository.getInstance();
    const webhooks = await webhookRepository.findByOrgIdAndTrigger({
      orgId: delegationCredential.organizationId,
      triggerEvent: WebhookTriggerEvents.DELEGATION_CREDENTIAL_ERROR,
    });

    if (webhooks.length === 0) {
      log.debug("No webhooks subscribed to DELEGATION_CREDENTIAL_ERROR for organization", {
        orgId: delegationCredential.organizationId,
      });
      return;
    }

    const payload = {
      error: {
        type: error.constructor.name,
        message: error.message,
      },
      credential: {
        id: credential.id,
        type: credential.type,
        appId: credential.appId || "unknown",
        delegationCredentialId: delegationCredential.id,
      },
      user: {
        id: user.id,
        email: user.email,
        organizationId: delegationCredential.organizationId,
      },
    } satisfies DelegationCredentialErrorPayloadType;

    const webhookPromises = webhooks.map((webhook) =>
      sendPayload(
        webhook.secret,
        WebhookTriggerEvents.DELEGATION_CREDENTIAL_ERROR,
        new Date().toISOString(),
        webhook,
        payload
      ).catch((err) => {
        log.error("Failed to send delegation credential error webhook", {
          webhookId: webhook.id,
          error: err instanceof Error ? err.message : String(err),
        });
      })
    );

    await Promise.allSettled(webhookPromises);

    log.info("Delegation credential error webhooks triggered", {
      webhookCount: webhooks.length,
      userId: user.id,
      credentialId: credential.id,
      errorType: error.constructor.name,
    });
  } catch (webhookError) {
    log.error("Failed to trigger delegation credential error webhook", {
      error: webhookError instanceof Error ? webhookError.message : String(webhookError),
    });
  }
}
