import { beforeEach, vi } from "vitest";
import { mockReset, mockDeep } from "vitest-mock-extended";

import type * as CalendarServicesMap from "../../../packages/app-store/calendar.services.generated";
import type * as VideoAdaptersMap from "../../../packages/app-store/conferencing.videoAdapters.generated";
import type * as CrmServicesMap from "../../../packages/app-store/crm.services.generated";
import type * as PaymentAppsMap from "../../../packages/app-store/payment.apps.generated";

vi.mock("../calendar.services.generated", () => calendarServicesMapMock);
vi.mock("../crm.services.generated", () => crmServicesMapMock);
vi.mock("../app-store/conferencing.videoAdapters.generated", () => videoAdaptersMapMock);
vi.mock("@calcom/app-store/payment.apps.generated", () => paymentAppMapMock);
vi.mock("../../app-store/payment.apps.generated", () => paymentAppMapMock);
vi.mock("../app-store/payment.apps.generated", () => paymentAppMapMock);

beforeEach(() => {
  mockReset(calendarServicesMapMock);
});

export const calendarServicesMapMock = mockDeep<typeof CalendarServicesMap>({
  fallbackMockImplementation: () => {
    throw new Error(
      "Unimplemented calendarServicesMapMock. You seem to have mocked the app that you are trying to use"
    );
  },
});

export const crmServicesMapMock = mockDeep<typeof CrmServicesMap>({
  fallbackMockImplementation: () => {
    throw new Error(
      "Unimplemented crmServicesMapMock. You seem to have mocked the app that you are trying to use"
    );
  },
});

export const paymentAppMapMock = mockDeep<typeof PaymentAppsMap>({
  fallbackMockImplementation: () => {
    throw new Error(
      "Unimplemented paymentAppMapMock. You seem to have mocked the app that you are trying to use"
    );
  },
});

export const videoAdaptersMapMock = mockDeep<typeof VideoAdaptersMap>({
  fallbackMockImplementation: () => {
    throw new Error(
      "Unimplemented videoAdaptersMapMock. You seem to have mocked the app that you are trying to use"
    );
  },
});
