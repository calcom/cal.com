import logger from "@calcom/lib/logger";
import { getPiiFreeCredential } from "@calcom/lib/piiFreeData";
import { safeStringify } from "@calcom/lib/safeStringify";
import { AuditLogTriggerTargets } from "@calcom/prisma/enums";

import type { AuditLogTriggerEvents } from "../../types";
import { createEvent } from "./createEvent";
import { getRelevantCredentials } from "./getRelevantCredentials";
import { reportEvent } from "./reportEvent";
import { interceptSystemEvents } from "./systemEventsInterceptor";

export const log = logger.getSubLogger({ prefix: ["handleAuditLogTrigger"] });

export async function handleAuditLogTrigger({
  trigger,
  user,
  source_ip,
  data,
}: {
  trigger: AuditLogTriggerEvents;
  user: { name: string; id: number };
  source_ip?: string | undefined;
  data: any;
}) {
  log.silly("Creating event.", safeStringify({ trigger, user, source_ip, data }));
  const event = createEvent(trigger, user, data, source_ip);
  log.silly("Event created", safeStringify(event));

  try {
    const credentials = await getRelevantCredentials(user);
    for (const credential of credentials) {
      log.silly(
        "Reporting procedure started for credential: ",
        safeStringify(getPiiFreeCredential(credential))
      );
      const innerEvent = { ...event };
      const appKey = credential.key as { disabledEvents: string[] };
      interceptSystemEvents(innerEvent, credential);

      if (
        appKey.disabledEvents &&
        appKey.disabledEvents.includes(event.action) &&
        event.target.type !== AuditLogTriggerTargets.SYSTEM
      ) {
        log.silly("Event disabled for credential");
        continue;
      }

      await reportEvent(credential, innerEvent);
    }
  } catch (error) {
    logger.error("Error while sending audit log", error);
  }
}
