import type * as reminderScheduler from "@calcom/features/ee/workflows/lib/reminders/reminderScheduler";
import { beforeEach, vi } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";

vi.mock("@calcom/features/ee/workflows/lib/reminders/reminderScheduler", () => reminderSchedulerMock);

beforeEach(() => {
  mockReset(reminderSchedulerMock);
});

const reminderSchedulerMock = mockDeep<typeof reminderScheduler>();
export default reminderSchedulerMock;
