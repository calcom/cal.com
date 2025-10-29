export {
  ScheduleRepository,
  type FindDetailedScheduleByIdReturnType,
} from "@calcom/features/schedules/repositories/ScheduleRepository";

export {
  updateSchedule,
  type UpdateScheduleResponse,
} from "@calcom/features/schedules/services/ScheduleService";
export { UserAvailabilityService } from "@calcom/features/availability/lib/getUserAvailability";

export {
  createHandler as createScheduleHandler,
  type CreateScheduleHandlerReturn,
} from "@calcom/trpc/server/routers/viewer/availability/schedule/create.handler";
export { ZCreateInputSchema as CreateScheduleSchema } from "@calcom/trpc/server/routers/viewer/availability/schedule/create.schema";

export {
  listHandler as getAvailabilityListHandler,
  type GetAvailabilityListHandlerReturn,
} from "@calcom/trpc/server/routers/viewer/availability/list.handler";
export {
  duplicateHandler as duplicateScheduleHandler,
  type DuplicateScheduleHandlerReturn,
} from "@calcom/trpc/server/routers/viewer/availability/schedule/duplicate.handler";
