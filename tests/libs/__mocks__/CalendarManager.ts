import { beforeEach, vi } from "vitest";
import { mockReset, mockDeep } from "vitest-mock-extended";

import type * as CalendarManager from "@calcom/lib/CalendarManager";

vi.mock("@calcom/lib/CalendarManager", () => CalendarManagerMock);

beforeEach(() => {
  mockReset(CalendarManagerMock);
});

const CalendarManagerMock = mockDeep<typeof CalendarManager>();
export default CalendarManagerMock;
