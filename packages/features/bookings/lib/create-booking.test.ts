import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/fetch-wrapper", () => ({
  post: vi.fn(),
}));

import { post } from "@calcom/lib/fetch-wrapper";
import { createBooking } from "./create-booking";

describe("createBooking", () => {
  it("calls POST /api/book/event with the provided data", async () => {
    const mockResponse = { id: 1, uid: "abc-123", startTime: "2024-01-15T10:00:00Z" };
    vi.mocked(post).mockResolvedValue(mockResponse);

    const data = {
      start: "2024-01-15T10:00:00Z",
      end: "2024-01-15T10:30:00Z",
      eventTypeId: 1,
      responses: { name: "Test", email: "test@example.com" },
    } as never;

    const result = await createBooking(data);
    expect(post).toHaveBeenCalledWith("/api/book/event", data);
    expect(result).toEqual(mockResponse);
  });

  it("propagates errors from the fetch wrapper", async () => {
    vi.mocked(post).mockRejectedValue(new Error("Network error"));

    await expect(createBooking({} as never)).rejects.toThrow("Network error");
  });

  it("returns response with string dates", async () => {
    const mockResponse = {
      id: 1,
      uid: "abc-123",
      startTime: "2024-01-15T10:00:00.000Z",
      endTime: "2024-01-15T10:30:00.000Z",
      title: "Meeting",
    };
    vi.mocked(post).mockResolvedValue(mockResponse);

    const result = await createBooking({} as never);
    expect(typeof result.startTime).toBe("string");
    expect(typeof result.endTime).toBe("string");
  });
});
