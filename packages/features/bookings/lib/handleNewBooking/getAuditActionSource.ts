import { CreationSource } from "@calcom/prisma/enums";
import type { ActionSource } from "@calcom/features/booking-audit/lib/types/actionSource";
import { criticalLogger } from "@calcom/lib/logger.server";

export const getAuditActionSource = ({ creationSource, eventTypeId, rescheduleUid }: { creationSource: CreationSource | null | undefined, eventTypeId: number, rescheduleUid: string | null }): ActionSource => {
    if (creationSource === CreationSource.API_V1) {
        return "API_V1";
    }
    if (creationSource === CreationSource.API_V2) {
        return "API_V2";
    }
    if (creationSource === CreationSource.WEBAPP) {
        return "WEBAPP";
    }
    // Unknown creationSource - log for tracking and fix
    criticalLogger.warn("Unknown booking creationSource detected", {
        eventTypeId,
        rescheduleUid,
    });
    return "UNKNOWN";
};