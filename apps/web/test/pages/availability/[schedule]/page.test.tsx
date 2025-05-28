import { unstable_cache } from "next/cache";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { ScheduleRepository } from "@calcom/lib/server/repository/schedule";
import { TravelScheduleRepository } from "@calcom/lib/server/repository/travelSchedule";

import {
  getCachedScheduleData,
  getCachedTravelSchedulesData,
} from "../../../../app/(use-page-wrapper)/availability/[schedule]/page";

vi.mock("@calcom/lib/server/repository/schedule", () => ({
  ScheduleRepository: {
    findDetailedScheduleById: vi.fn().mockImplementation(() => Promise.resolve({})),
  },
}));

vi.mock("@calcom/lib/server/repository/travelSchedule", () => ({
  TravelScheduleRepository: {
    findTravelSchedulesByUserId: vi.fn().mockImplementation(() => Promise.resolve([])),
  },
}));

vi.mock("next/cache", () => ({
  unstable_cache: vi.fn((fn) => {
    return fn;
  }),
}));

describe("Availability Schedule Page Caching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should cache schedule data with 1 hour revalidation", async () => {
    const mockScheduleData = { id: 1, name: "Test Schedule" };
    (ScheduleRepository.findDetailedScheduleById as jest.Mock).mockResolvedValue(mockScheduleData);

    const result = await getCachedScheduleData(1, 123, "UTC", 1);

    expect(ScheduleRepository.findDetailedScheduleById).toHaveBeenCalledWith({
      scheduleId: 1,
      userId: 123,
      timeZone: "UTC",
      defaultScheduleId: 1,
    });

    expect(unstable_cache).toHaveBeenCalledWith(expect.any(Function), ["schedule.findDetailedScheduleById"], {
      revalidate: 3600,
    });

    expect(result).toEqual(mockScheduleData);
  });

  it("should cache travel schedules data with 1 hour revalidation", async () => {
    const mockTravelSchedules = [{ id: 1, timeZone: "America/New_York" }];
    (TravelScheduleRepository.findTravelSchedulesByUserId as jest.Mock).mockResolvedValue(
      mockTravelSchedules
    );

    const result = await getCachedTravelSchedulesData(123);

    expect(TravelScheduleRepository.findTravelSchedulesByUserId).toHaveBeenCalledWith(123);

    expect(unstable_cache).toHaveBeenCalledWith(
      expect.any(Function),
      ["travelSchedule.findTravelSchedulesByUserId"],
      { revalidate: 3600 }
    );

    expect(result).toEqual(mockTravelSchedules);
  });
});
