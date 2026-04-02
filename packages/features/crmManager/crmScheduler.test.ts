import { beforeEach, describe, expect, test, vi } from "vitest";

const mockCreateEvent = vi.fn();

vi.mock("@calcom/features/crmManager/di/tasker/crm-tasker.container", () => ({
  getCRMTasker: () => ({
    createEvent: mockCreateEvent,
  }),
}));

import CRMScheduler from "./crmScheduler";

describe("CRMScheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("scenario 28: calls CRMTasker.createEvent with correct payload", async () => {
    mockCreateEvent.mockResolvedValue({ runId: "run-123" });

    await CRMScheduler.createEvent({ bookingUid: "booking-123" });

    expect(mockCreateEvent).toHaveBeenCalledWith({
      payload: { bookingUid: "booking-123" },
    });
  });

  test("scenario 29: returns the runId from CRMTasker", async () => {
    mockCreateEvent.mockResolvedValue({ runId: "run-456" });

    const result = await CRMScheduler.createEvent({ bookingUid: "booking-456" });

    expect(result).toEqual({ runId: "run-456" });
  });

  test("scenario 30: propagates errors from CRMTasker", async () => {
    mockCreateEvent.mockRejectedValue(new Error("CRM task failed"));

    await expect(CRMScheduler.createEvent({ bookingUid: "booking-789" })).rejects.toThrow("CRM task failed");
  });
});
