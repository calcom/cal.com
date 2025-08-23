import { beforeEach, vi } from "vitest";
import { mockReset } from "vitest-mock-extended";

import type * as calendarLoaders from "@calcom/app-store/_utils/calendars/calendarLoaders";

import { mockDeepHelper } from "./mockDeepHelper";

const calendarAppsMock = mockDeepHelper<typeof calendarLoaders>("calendarAppsMock");

vi.mock("@calcom/app-store/_utils/calendars/calendarLoaders", () => calendarAppsMock);

beforeEach(() => {
  mockReset(calendarAppsMock);
});

export default calendarAppsMock;
