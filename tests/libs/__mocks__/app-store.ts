// tests/libs/__mocks__/app-store.ts
// Centralized helpers to mock the new generated maps in unit tests.
// Call mockPaymentApps() / mockCalendarServices() at the top of tests that use them.

export const mockPaymentApps = () => {
  doMock("@calcom/app-store/payment.apps.generated", () => ({
    PAYMENT_APPS: {
      "mock-payment-app": {
        lib: {
          PaymentService: class {
            async charge()       { return { ok: true }; } // legacy
            async chargeCard()   { return { ok: true }; } // new usage
            async refund()       { return { ok: true }; }
            async deletePayment(){ return true; }
            isSetupAlready()     { return true; }
          },
        },
      },
      stripepayment: {
        lib: {
          PaymentService: class {
            async charge()       { return { ok: true }; }
            async chargeCard()   { return { ok: true }; }
            async refund()       { return { ok: true }; }
            async deletePayment(){ return true; }
            isSetupAlready()     { return true; }
          },
        },
      },
    },
  }));
};


export const mockCalendarServices = () => {
  doMock("@calcom/app-store/calendar.services.generated", () => ({
    CALENDAR_SERVICES: {
      // Add others as your tests require
      googlecalendar: {
        lib: {
          CalendarService: class {
            async listCalendars() { return []; }
          },
        },
      },
    },
  }));
};
export const mockAnalyticsServices = () => {
  doMock("@calcom/app-store/analytics.apps.generated", () => ({
    ANALYTICS_APPS: {
      dub: {
        lib: {
          AnalyticsService: class {
            async sendEvent() { return { ok: true }; }
          },
        },
      },
    },
  }));
};

// Update the backwards-compat wrapper
export const mockAppStore = () => {
  mockPaymentApps();
  mockCalendarServices();
  mockAnalyticsServices(); // Add this line
};

