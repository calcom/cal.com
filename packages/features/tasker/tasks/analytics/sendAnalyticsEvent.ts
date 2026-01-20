import { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

import AnalyticsManager from "./analyticsManager";
import { sendAnalyticsEventSchema } from "./schema";

const log = logger.getSubLogger({ prefix: [`[[tasker] sendAnalyticsEvent]`] });

export async function sendAnalyticsEvent(payload: string): Promise<void> {
  try {
    const parsedPayload = sendAnalyticsEventSchema.safeParse(JSON.parse(payload));
    if (!parsedPayload.success) {
      throw new Error(`malformed payload in sendAnalyticsEvent: ${parsedPayload.error}`);
    }

    const { credentialId, info } = parsedPayload.data;
    const credential = await CredentialRepository.findFirstByIdWithKeyAndUser({ id: credentialId });

    if (!credential) {
      throw new Error("Invalid credential");
    }
    const manager = new AnalyticsManager(credential);

    if (!manager) return;

    await manager.sendEvent(info);
  } catch (err) {
    log.error(
      `[Will retry] Error creating analytics event: error: ${safeStringify(err)} payload: ${safeStringify({
        payload,
      })}`
    );
    // Intentional rethrow to trigger retry
    throw err;
  }
}
