export {
  ScheduleRepository,
  type FindDetailedScheduleByIdReturnType,
} from "@calcom/lib/server/repository/schedule";

export { updateSchedule, type UpdateScheduleResponse } from "@calcom/lib/schedules/updateSchedule";
export { UserAvailabilityService } from "@calcom/lib/getUserAvailability";

export {
  createHandler as createScheduleHandler,
  type CreateScheduleHandlerReturn,
} from "@calcom/trpc/server/routers/viewer/availability/schedule/create.handler";
export { ZCreateInputSchema as CreateAtomScheduleDto } from "@calcom/trpc/server/routers/viewer/availability/schedule/create.schema";
