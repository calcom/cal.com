import logger from "@calcom/lib/logger";

import { getAuditLogManager } from "./getAuditLogManager";

export async function handleAuditLogTrigger(message: string) {
  try {
    const auditLogManager = await getAuditLogManager();

    auditLogManager.report(message);
  } catch (error) {
    logger.error("Error while sending audit log", error);
  }
}
