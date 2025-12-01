import { z } from "zod";

import { ActorSchema } from "@calcom/features/bookings/lib/types/actor";
import {
    CreatedAuditActionService,
} from "../actions/CreatedAuditActionService";


const baseSchema = z.object({
    bookingUid: z.string(),
    actor: ActorSchema,
    organizationId: z.number().nullable(),
    timestamp: z.number(),
});

export const BookingAuditTaskConsumerPayloadSchema = z.discriminatedUnion("action", [
    baseSchema.merge(z.object({
        action: z.literal(CreatedAuditActionService.TYPE),
        // Payload in Task record could have any version of the data schema
        data: CreatedAuditActionService.storedFieldsSchema,
    })),
]);

export type BookingAuditTaskProducerActionData =
    | { action: typeof CreatedAuditActionService.TYPE; data: z.infer<typeof CreatedAuditActionService.latestFieldsSchema> }

export type BookingAuditTaskConsumerPayload = z.infer<typeof BookingAuditTaskConsumerPayloadSchema>;
