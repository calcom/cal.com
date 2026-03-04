import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@calcom/features/tasker");
vi.mock("@calcom/features/tasker/tasks", () => ({
  tasksConfig: {
    createCRMEvent: {
      maxAttempts: 10,
    },
  },
}));

import tasker from "@calcom/features/tasker";
import { tasksConfig } from "@calcom/features/tasker/tasks";
import CRMScheduler from "./crmScheduler";

const mockedTasker: ReturnType<typeof vi.mocked<typeof tasker>> = vi.mocked(tasker);

describe("CRMScheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("scenario 28: calls tasker.create with correct task name and payload", async () => {
    mockedTasker.create.mockResolvedValue("task-id-1");

    await CRMScheduler.createEvent({ bookingUid: "booking-123" });

    expect(mockedTasker.create).toHaveBeenCalledWith(
      "createCRMEvent",
      { bookingUid: "booking-123" },
      { maxAttempts: 10 }
    );
  });

  test("scenario 29: uses tasksConfig.createCRMEvent.maxAttempts when defined", async () => {
    mockedTasker.create.mockResolvedValue("task-id-2");

    await CRMScheduler.createEvent({ bookingUid: "booking-456" });

    const callArgs = mockedTasker.create.mock.calls[0];
    expect(callArgs[2]).toEqual({ maxAttempts: tasksConfig.createCRMEvent?.maxAttempts });
  });

  test("scenario 30: falls back to maxAttempts 5 when tasksConfig.createCRMEvent is undefined", async () => {
    // Override the tasksConfig mock to remove createCRMEvent
    const originalConfig = tasksConfig.createCRMEvent;
    // @ts-expect-error -- intentionally setting to undefined for test
    tasksConfig.createCRMEvent = undefined;

    mockedTasker.create.mockResolvedValue("task-id-3");

    await CRMScheduler.createEvent({ bookingUid: "booking-789" });

    expect(mockedTasker.create).toHaveBeenCalledWith(
      "createCRMEvent",
      { bookingUid: "booking-789" },
      { maxAttempts: 5 }
    );

    // Restore
    tasksConfig.createCRMEvent = originalConfig;
  });
});
