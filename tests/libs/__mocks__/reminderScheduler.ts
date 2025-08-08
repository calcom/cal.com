import type * as reminderScheduler from "@calid/features/workflows/utils/reminderScheduler";
import { beforeEach, vi } from "vitest";
import { mockReset, mockDeep } from "vitest-mock-extended";

vi.mock("@calid/features/workflows/utils/reminderScheduler", () => reminderSchedulerMock);

beforeEach(() => {
  mockReset(reminderSchedulerMock);
});

const reminderSchedulerMock = mockDeep<typeof reminderScheduler>();
export default reminderSchedulerMock;
