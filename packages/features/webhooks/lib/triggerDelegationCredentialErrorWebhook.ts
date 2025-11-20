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
  orgId?: number | null;
}): Promise<void> {
  try {
    const { error, credential, user, orgId } = params;

    if (!orgId) {
      log.debug("Skipping webhook emission - no organization context");
      return;
    }

    const webhookRepository = WebhookRepository.getInstance();
    const webhooks = await webhookRepository.getSubscribers({
      teamId: orgId,
      triggerEvent: WebhookTriggerEvents.DELEGATION_CREDENTIAL_ERROR,
    });

    if (webhooks.length === 0) {
      log.debug("No webhooks subscribed to DELEGATION_CREDENTIAL_ERROR for organization", { orgId });
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
      },
      user: {
        id: user.id,
        email: user.email,
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
