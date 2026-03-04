// Mock base classes for @calcom/platform-libraries/slots
// These are extended by NestJS injectable services in apps/api/v2

export class AvailableSlotsService {
  constructor(_deps: Record<string, unknown>) {}
  async getAvailableSlots(_args: unknown) {
    return { slots: {} };
  }
}

export class BusyTimesService {
  constructor(_deps: Record<string, unknown>) {}
}

export class QualifiedHostsService {
  constructor(_deps: Record<string, unknown>) {}
}

export class FilterHostsService {
  constructor(_deps: Record<string, unknown>) {}
}

export class NoSlotsNotificationService {
  constructor(_deps: Record<string, unknown>) {}
}

export const validateRoundRobinSlotAvailability = jest.fn();
