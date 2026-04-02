import { beforeEach, vi } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";
import type * as CalendarManager from "../CalendarManager";

vi.mock("@calcom/features/calendars/lib/CalendarManager", () => CalendarManagerMock);

beforeEach(() => {
  mockReset(CalendarManagerMock);
});

const CalendarManagerMock = mockDeep<typeof CalendarManager>();
export default CalendarManagerMock;
