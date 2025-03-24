import { beforeEach, vi } from "vitest";
import { mockReset, mockDeep } from "vitest-mock-extended";

import type * as CalendarServicesMap from "../../../packages/app-store/calendar.services.generated";
import type * as VideoAdaptersMap from "../../../packages/app-store/conferencing.videoAdapters.generated";
import type * as CrmServicesMap from "../../../packages/app-store/crm.services.generated";
import type * as PaymentAppsMap from "../../../packages/app-store/payment.apps.generated";

vi.mock("@calcom/app-store/calendar.services.generated", () => ({
  CalendarServiceMap: calendarServicesMapMock,
}));
vi.mock("@calcom/app-store/crm.services.generated", () => ({
  CrmServiceMap: crmServicesMapMock,
}));
vi.mock("@calcom/app-store/conferencing.videoAdapters.generated", () => ({
  VideoAdapterMap: videoAdaptersMapMock,
}));
vi.mock("@calcom/app-store/payment.apps.generated", () => ({
  PaymentAppMap: paymentAppMapMock,
}));

beforeEach(() => {
  mockReset(calendarServicesMapMock);
  mockReset(crmServicesMapMock);
  mockReset(paymentAppMapMock);
  mockReset(videoAdaptersMapMock);
});

export const calendarServicesMapMock = mockDeep<typeof CalendarServicesMap.CalendarServiceMap>();
export const crmServicesMapMock = mockDeep<typeof CrmServicesMap.CrmServiceMap>();
export const paymentAppMapMock = mockDeep<typeof PaymentAppsMap.PaymentAppMap>();
export const videoAdaptersMapMock = mockDeep<typeof VideoAdaptersMap.ConferencingVideoAdapterMap>();
