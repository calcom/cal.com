import { describe, it, expect, beforeEach, vi } from "vitest";

import { localStorage } from "@calcom/lib/webstorage";

import { setLastBookingResponse, getLastBookingResponse } from "./lastBookingResponse";

vi.mock("@calcom/lib/webstorage", () => ({
  localStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

describe("Last Booking Response", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("setLastBookingResponse", () => {
    it("should not store anything if responses is null", () => {
      setLastBookingResponse(null);
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    it("should store only allowed responses in localStorage", () => {
      const responses = {
        email: "test@example.com",
        name: "John Doe",
        age: 30,
      };

      setLastBookingResponse(responses);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        "lastBookingResponse",
        JSON.stringify({ email: "test@example.com", name: "John Doe" })
      );
    });
  });

  describe("getLastBookingResponse", () => {
    it("should return an empty object if there is no last booking response", () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(null);

      const result = getLastBookingResponse();
      expect(result).toEqual({});
    });

    it("should return parsed response if valid JSON is present", () => {
      const mockResponse = JSON.stringify({ email: "test@example.com", name: "John Doe" });
      (localStorage.getItem as jest.Mock).mockReturnValue(mockResponse);

      const result = getLastBookingResponse();
      expect(result).toEqual({ email: "test@example.com", name: "John Doe" });
    });

    it("should return an empty object if JSON is invalid", () => {
      const invalidJson = "{ email: 'test@example.com' ";
      (localStorage.getItem as jest.Mock).mockReturnValue(invalidJson);

      const result = getLastBookingResponse();
      expect(result).toEqual({});
    });
  });
});
