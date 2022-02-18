import * as z from "zod"
import * as imports from "../zod-utils"
import { CompleteUser, UserModel, CompleteEventType, EventTypeModel, CompleteSchedule, ScheduleModel } from "./index"

export const _AvailabilityModel = z.object({
  id: z.number().int(),
  userId: z.number().int().nullish(),
  eventTypeId: z.number().int().nullish(),
  days: z.number().int().array(),
  startTime: z.date(),
  endTime: z.date(),
  date: z.date().nullish(),
  scheduleId: z.number().int().nullish(),
})

export interface CompleteAvailability extends z.infer<typeof _AvailabilityModel> {
  user?: CompleteUser | null
  eventType?: CompleteEventType | null
  Schedule?: CompleteSchedule | null
}

/**
 * AvailabilityModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const AvailabilityModel: z.ZodSchema<CompleteAvailability> = z.lazy(() => _AvailabilityModel.extend({
  user: UserModel.nullish(),
  eventType: EventTypeModel.nullish(),
  Schedule: ScheduleModel.nullish(),
}))
