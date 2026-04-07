// Mock for @calcom/platform-libraries/calendars

export const credentialForCalendarServiceSelect = {
  id: true,
  appId: true,
  type: true,
  userId: true,
  user: {
    select: {
      email: true,
    },
  },
  teamId: true,
  key: true,
  encryptedKey: true,
  invalid: true,
  delegationCredentialId: true,
};

export class CalendarsTaskService {
  constructor(_deps?: Record<string, unknown>) {}
}

export class CalendarsSyncTasker {
  constructor(_deps?: Record<string, unknown>) {}
}

export class CalendarsTriggerTasker {
  constructor(_deps?: Record<string, unknown>) {}
}

export class CalendarsTasker {
  constructor(_deps?: Record<string, unknown>) {}
}
