import * as z from "zod";
import * as imports from "../zod-utils";
import { EventTypeCustomInputType } from "@prisma/client";
import { CompleteEventType, EventTypeModel } from "./index";

export const _EventTypeCustomInputModel = z.object({
  id: z.number().int(),
  eventTypeId: z.number().int(),
  label: z.string(),
  type: z.nativeEnum(EventTypeCustomInputType),
  required: z.boolean(),
  placeholder: z.string(),
});

export interface CompleteEventTypeCustomInput extends z.infer<typeof _EventTypeCustomInputModel> {
  eventType: CompleteEventType;
}

/**
 * EventTypeCustomInputModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const EventTypeCustomInputModel: z.ZodSchema<CompleteEventTypeCustomInput> = z.lazy(() =>
  _EventTypeCustomInputModel.extend({
    eventType: EventTypeModel,
  })
);
