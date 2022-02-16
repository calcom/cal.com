import * as z from "zod";
import * as imports from "../zod-utils";
import { CompleteUser, UserModel, CompleteEventType, EventTypeModel } from "./index";

// Helper schema for JSON fields
type Literal = boolean | number | string;
type Json = Literal | { [key: string]: Json } | Json[];
const literalSchema = z.union([z.string(), z.number(), z.boolean()]);
const jsonSchema: z.ZodSchema<Json> = z.lazy(() =>
  z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)])
);

export const _ScheduleModel = z.object({
  id: z.number().int(),
  userId: z.number().int().nullish(),
  eventTypeId: z.number().int().nullish(),
  title: z.string().nullish(),
  freeBusyTimes: jsonSchema,
});

export interface CompleteSchedule extends z.infer<typeof _ScheduleModel> {
  user?: CompleteUser | null;
  eventType?: CompleteEventType | null;
}

/**
 * ScheduleModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const ScheduleModel: z.ZodSchema<CompleteSchedule> = z.lazy(() =>
  _ScheduleModel.extend({
    user: UserModel.nullish(),
    eventType: EventTypeModel.nullish(),
  })
);
