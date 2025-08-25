import { beforeEach, vi } from "vitest";
import { mockReset } from "vitest-mock-extended";

import type * as calendarLoaders from "@calcom/app-store/_utils/calendars/calendarLoaders";

import { mockDeepHelper } from "./mockDeepHelper";

const calendarLoadersMock = mockDeepHelper<typeof calendarLoaders>("calendarLoadersMock");

vi.mock("@calcom/app-store/_utils/calendars/calendarLoaders", () => calendarLoadersMock);

beforeEach(() => {
  mockReset(calendarLoadersMock);
});

export default calendarLoadersMock;
