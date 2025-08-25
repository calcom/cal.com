// tests/libs/__mocks__/app-store.ts
// Centralized helpers to mock the new generated maps in unit tests.
// Call mockPaymentApps() / mockCalendarServices() at the top of tests that use them.

export const mockPaymentApps = () => {
  doMock("@calcom/app-store/payment.apps.generated", () => ({
    PAYMENT_APPS: {
      "mock-payment-app": () => Promise.resolve({
        lib: {
          PaymentService: class {
            async charge()       { return { ok: true }; }
            async chargeCard()   { return { ok: true }; }
            async refund()       { return { ok: true }; }
            async deletePayment(){ return true; }
            isSetupAlready()     { return true; }
          },
        },
      }),
      stripepayment: () => Promise.resolve({
        lib: {
          PaymentService: class {
            async charge()       { return { ok: true }; }
            async chargeCard()   { return { ok: true }; }
            async refund()       { return { ok: true }; }
            async deletePayment(){ return true; }
            isSetupAlready()     { return true; }
          },
        },
      }),
    },
  }));
};

export const mockCalendarServices = () => {
  doMock("@calcom/app-store/calendar.services.generated", () => ({
    CALENDAR_SERVICES: {
      googlecalendar: () => Promise.resolve({
        lib: {
          CalendarService: class {
            listCalendars() { return []; }
          },
        },
      }),
    },
  }));
};

export const mockAnalyticsServices = () => {
  doMock("@calcom/app-store/analytics.apps.generated", () => ({
    ANALYTICS_APPS: {
      dub: () => Promise.resolve({
        lib: {
          AnalyticsService: class {
            async sendEvent() { return { ok: true }; }
          },
        },
      }),
    },
  }));
};



export const mockVideoAdapters = () => {
  doMock("@calcom/app-store/conferencing.videoAdapters.generated", () => ({
    VIDEO_ADAPTERS: {
      zoomvideo: async () => ({ lib: { VideoAdapter: class {} }, metadata: { name: "Zoom" } }),
      dailyvideo: async () => ({ lib: { VideoAdapter: class {} }, metadata: { name: "Daily" } }),
    },
  }));
};

// Update the backwards-compat wrapper
export const mockAppStore = () => {
  mockPaymentApps();
  mockCalendarServices();
  mockAnalyticsServices();
  mockVideoAdapters(); // ← add this
};

const doMock = require("doMock");


