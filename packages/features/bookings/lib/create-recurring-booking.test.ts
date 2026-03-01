import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/fetch-wrapper", () => ({
  post: vi.fn(),
}));

import { post } from "@calcom/lib/fetch-wrapper";
import { createRecurringBooking } from "./create-recurring-booking";

describe("createRecurringBooking", () => {
  it("calls POST /api/book/recurring-event with the provided data array", async () => {
    const mockResponse = [
      { id: 1, uid: "rec-1", startTime: "2024-01-15T10:00:00Z", endTime: "2024-01-15T10:30:00Z" },
      { id: 2, uid: "rec-2", startTime: "2024-01-22T10:00:00Z", endTime: "2024-01-22T10:30:00Z" },
    ];
    vi.mocked(post).mockResolvedValue(mockResponse);

    const data = [
      { start: "2024-01-15T10:00:00Z", eventTypeId: 1, recurringEventId: "rec-group" },
      { start: "2024-01-22T10:00:00Z", eventTypeId: 1, recurringEventId: "rec-group" },
    ] as never;

    const result = await createRecurringBooking(data);
    expect(post).toHaveBeenCalledWith("/api/book/recurring-event", data);
    expect(result).toHaveLength(2);
  });

  it("propagates errors from the fetch wrapper", async () => {
    vi.mocked(post).mockRejectedValue(new Error("Rate limited"));

    await expect(createRecurringBooking([] as never)).rejects.toThrow("Rate limited");
  });
});
