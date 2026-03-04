// Mock base classes for @calcom/platform-libraries/schedules

export class ScheduleRepository {
  constructor(_prismaClient?: unknown) {}
}

export class UserAvailabilityService {
  constructor(_deps?: Record<string, unknown>) {}
}

export const updateSchedule = jest.fn();
export const createScheduleHandler = jest.fn();
export const getAvailabilityListHandler = jest.fn();
export const ZCreateInputSchema = {};
