export {
  ScheduleRepository,
  type FindDetailedScheduleByIdReturnType,
} from "@calcom/lib/server/repository/schedule";

export { updateSchedule, type UpdateScheduleResponse } from "@calcom/lib/schedules/updateSchedule";
export { UserAvailabilityService } from "@calcom/lib/getUserAvailability";

export {
  listHandler as getAvailabilityListHandler,
  type GetAvailabilityListHandlerReturn,
} from "@calcom/trpc/server/routers/viewer/availability/list.handler";
export {
  duplicateHandler as duplicateScheduleHandler,
  type DuplicateScheduleHandlerReturn,
} from "@calcom/trpc/server/routers/viewer/availability/schedule/duplicate.handler";
