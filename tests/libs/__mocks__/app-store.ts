// tests/libs/__mocks__/app-store.ts
// Centralized helpers to mock the new generated maps in unit tests.
// Call mockPaymentApps() / mockCalendarServices() at the top of tests that use them.

export const mockPaymentApps = () => {
  jest.doMock("@calcom/app-store/payment.apps.generated", () => ({
    PAYMENT_APPS: {
      // Keys here must match real app dirNames used in tests (add/adjust as needed)
      "mock-payment-app": jest.fn(async () => ({
        lib: {
          PaymentService: class {
            async charge() { return { ok: true }; }
            async refund() { return { ok: true }; }
          },
        },
      })),
      stripepayment: jest.fn(async () => ({
        lib: {
          PaymentService: class {
            async charge() { return { ok: true }; }
            async refund() { return { ok: true }; }
          },
        },
      })),
    },
  }));
};

export const mockCalendarServices = () => {
  jest.doMock("@calcom/app-store/calendar.services.generated", () => ({
    CALENDAR_SERVICES: {
      // Add others as your tests require
      googlecalendar: jest.fn(async () => ({
        lib: {
          CalendarService: class {
            async listCalendars() { return []; }
          },
        },
      })),
    },
  }));
};

// Backwards-compat: some suites may still import and call this:
export const mockAppStore = () => {
  mockPaymentApps();
  mockCalendarServices();
};
