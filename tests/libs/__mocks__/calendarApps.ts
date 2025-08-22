import { beforeEach, vi } from "vitest";
import { mockReset, mockDeep } from "vitest-mock-extended";

import type { calendarLoaders } from "@calcom/app-store/_utils/calendars/calendarLoaders";

vi.mock("@calcom/app-store/_utils/calendars/calendarLoaders", () => calendarAppsMock);

beforeEach(() => {
  mockReset(calendarAppsMock);
});

export const calendarAppsMock = mockDeep<typeof calendarLoaders>({
  fallbackMockImplementation: () => {
    throw new Error(
      "Unimplemented calendarAppsMock. You seem to have not mocked the app that you are trying to use"
    );
  },
});
