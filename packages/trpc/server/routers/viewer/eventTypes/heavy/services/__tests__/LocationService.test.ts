import { describe, it, expect, vi, beforeEach } from "vitest";
import { LocationService } from "../location/LocationService";
import { DailyLocationType } from "@calcom/app-store/constants";

// Mock getDefaultLocations
vi.mock("@calcom/app-store/_utils/getDefaultLocations", () => ({
  getDefaultLocations: vi.fn(),
}));

import { getDefaultLocations } from "@calcom/app-store/_utils/getDefaultLocations";
const mockGetDefaultLocations = vi.mocked(getDefaultLocations);

describe("LocationService", () => {
  let service: LocationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LocationService();
  });

  describe("processLocations", () => {
    it("should use provided locations when available", async () => {
      const inputLocations = [
        { type: "zoom", link: "https://zoom.us/j/123" },
        { type: DailyLocationType },
      ];

      const user = { id: 1, email: "test@example.com" };

      const result = await service.processLocations(inputLocations, user);

      expect(result.locations).toEqual(inputLocations);
      expect(result.hasCalVideo).toBe(true);
      expect(mockGetDefaultLocations).not.toHaveBeenCalled();
    });

    it("should use default locations when no input provided", async () => {
      const defaultLocations = [
        { type: "phone", phone: "+1234567890" },
      ];

      mockGetDefaultLocations.mockResolvedValue(defaultLocations as any);

      const user = { id: 1, email: "test@example.com" };

      const result = await service.processLocations(undefined, user);

      expect(result.locations).toEqual(defaultLocations);
      expect(result.hasCalVideo).toBe(false);
      expect(mockGetDefaultLocations).toHaveBeenCalledWith(user);
    });

    it("should detect Cal.video location correctly", async () => {
      const locationsWithCalVideo = [
        { type: DailyLocationType },
        { type: "zoom", link: "https://zoom.us/j/123" },
      ];

      const user = { id: 1, email: "test@example.com" };

      const result = await service.processLocations(locationsWithCalVideo, user);

      expect(result.hasCalVideo).toBe(true);
    });

    it("should handle empty locations array", async () => {
      const defaultLocations = [{ type: "inPerson", address: "123 Main St" }];
      mockGetDefaultLocations.mockResolvedValue(defaultLocations as any);

      const user = { id: 1, email: "test@example.com" };

      const result = await service.processLocations([], user);

      expect(result.locations).toEqual(defaultLocations);
      expect(mockGetDefaultLocations).toHaveBeenCalledWith(user);
    });
  });

  describe("validateLocations", () => {
    it("should return true for valid locations", () => {
      const locations = [
        { type: "zoom", link: "https://zoom.us/j/123" },
        { type: "phone", phone: "+1234567890" },
      ];

      const result = service.validateLocations(locations as any);

      expect(result).toBe(true);
    });

    it("should return false for locations without type", () => {
      const locations = [
        { link: "https://zoom.us/j/123" },
        { type: "phone", phone: "+1234567890" },
      ];

      const result = service.validateLocations(locations as any);

      expect(result).toBe(false);
    });

    it("should return true for empty array", () => {
      const result = service.validateLocations([]);

      expect(result).toBe(true);
    });
  });
});