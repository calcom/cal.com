import type { z } from "zod";
import type { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";
/**
 * Determines if a booking actually requires confirmation(considering requiresConfirmationThreshold)
 */
export declare const doesBookingRequireConfirmation: ({ booking: { startTime, eventType }, }: {
    booking: {
        startTime: Date;
        eventType: {
            requiresConfirmation?: boolean | undefined;
            metadata: z.infer<typeof EventTypeMetaDataSchema>;
        } | null;
    };
}) => boolean | undefined;
//# sourceMappingURL=doesBookingRequireConfirmation.d.ts.map