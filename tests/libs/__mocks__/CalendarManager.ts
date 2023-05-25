import { beforeEach, vi } from "vitest";
import { mockReset, mockDeep } from "vitest-mock-extended";

import type * as CalendarManager from "@calcom/core/CalendarManager";

vi.mock("@calcom/core/CalendarManager", () => CalendarManagerMock);

beforeEach(() => {
  mockReset(CalendarManagerMock);
});

const CalendarManagerMock = mockDeep<typeof CalendarManager>();
export default CalendarManagerMock;
