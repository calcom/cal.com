// Mock base classes for @calcom/platform-libraries/bookings

export class CheckBookingLimitsService {
  constructor(_deps?: Record<string, unknown>) {}
}

export class CheckBookingAndDurationLimitsService {
  constructor(_deps?: Record<string, unknown>) {}
}

export class LuckyUserService {
  constructor(_deps?: Record<string, unknown>) {}
}

export class BookingCancelService {
  constructor(_deps?: Record<string, unknown>) {}
}

export class RegularBookingService {
  constructor(_deps?: Record<string, unknown>) {}
}

export class RecurringBookingService {
  constructor(_deps?: Record<string, unknown>) {}
}

export class InstantBookingCreateService {
  constructor(_deps?: Record<string, unknown>) {}
}

export class BookingEventHandlerService {
  constructor(_deps?: Record<string, unknown>) {}
}

export class BookingEmailSmsHandler {
  constructor(_deps?: Record<string, unknown>) {}
}

export class BookingEmailAndSmsTasker {
  constructor(_deps?: Record<string, unknown>) {}
}

export class BookingEmailAndSmsSyncTasker {
  constructor(_deps?: Record<string, unknown>) {}
}

export class BookingEmailAndSmsTaskService {
  constructor(_deps?: Record<string, unknown>) {}
}

export class BookingEmailAndSmsTriggerDevTasker {
  constructor(_deps?: Record<string, unknown>) {}
}

export class BookingAuditTaskerProducerService {
  constructor(_deps?: Record<string, unknown>) {}
}

export class BookingAuditTasker {
  constructor(_deps?: Record<string, unknown>) {}
}

export class BookingAuditSyncTasker {
  constructor(_deps?: Record<string, unknown>) {}
}

export class BookingAuditTriggerTasker {
  constructor(_deps?: Record<string, unknown>) {}
}

export class BookingAuditTaskConsumer {
  constructor(_deps?: Record<string, unknown>) {}
}

export class PrismaBookingAuditRepository {
  constructor(_deps?: Record<string, unknown>) {}
}

export class PrismaAuditActorRepository {
  constructor(_deps?: Record<string, unknown>) {}
}

export class BookingAuditActionServiceRegistry {
  constructor() {}
}

export const getAuditActorRepository = jest.fn();
export const makeUserActor = jest.fn();
