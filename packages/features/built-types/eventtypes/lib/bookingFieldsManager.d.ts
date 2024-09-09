import type { z } from "zod";
import type { EventType } from "@calcom/prisma/client";
import type { eventTypeBookingFields } from "@calcom/prisma/zod-utils";
type Field = z.infer<typeof eventTypeBookingFields>[number];
/**
 *
 * @param fieldToAdd Field to add
 * @param source Source of the field to be shown in UI
 * @param eventTypeId
 */
export declare function upsertBookingField(fieldToAdd: Omit<Field, "required">, source: NonNullable<Field["sources"]>[number], eventTypeId: EventType["id"]): Promise<void>;
export declare function removeBookingField(fieldToRemove: Pick<Field, "name">, source: Pick<NonNullable<Field["sources"]>[number], "id" | "type">, eventTypeId: EventType["id"]): Promise<void>;
export {};
//# sourceMappingURL=bookingFieldsManager.d.ts.map