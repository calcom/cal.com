import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/fetch-wrapper", () => ({
  post: vi.fn(),
}));

import { post } from "@calcom/lib/fetch-wrapper";
import { createInstantBooking } from "./create-instant-booking";

describe("createInstantBooking", () => {
  it("calls POST /api/book/instant-event with the provided data", async () => {
    const mockResponse = { id: 1, uid: "instant-123", expires: "2024-01-15T10:05:00Z" };
    vi.mocked(post).mockResolvedValue(mockResponse);

    const data = {
      start: "2024-01-15T10:00:00Z",
      eventTypeId: 1,
      responses: { name: "Test", email: "test@example.com" },
    } as never;

    const result = await createInstantBooking(data);
    expect(post).toHaveBeenCalledWith("/api/book/instant-event", data);
    expect(result).toEqual(mockResponse);
  });

  it("propagates errors from the fetch wrapper", async () => {
    vi.mocked(post).mockRejectedValue(new Error("Service unavailable"));

    await expect(createInstantBooking({} as never)).rejects.toThrow("Service unavailable");
  });
});
