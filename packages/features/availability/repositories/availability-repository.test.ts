import prismaMock from "@calcom/testing/lib/__mocks__/prismaMock";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AvailabilityRepository } from "./availability-repository";

describe("AvailabilityRepository", () => {
  let availabilityRepository: AvailabilityRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    availabilityRepository = new AvailabilityRepository(prismaMock);
  });

  describe("createMany", () => {
    it("should call prisma with correct data and return result", async () => {
      const mockResult = { count: 2 };
      prismaMock.availability.createMany.mockResolvedValue(mockResult);

      const createData = [
        {
          days: [1, 2, 3, 4, 5],
          startTime: new Date("1970-01-01T09:00:00.000Z"),
          endTime: new Date("1970-01-01T17:00:00.000Z"),
          userId: 100,
        },
        {
          days: [1, 2, 3, 4, 5],
          startTime: new Date("1970-01-01T09:00:00.000Z"),
          endTime: new Date("1970-01-01T17:00:00.000Z"),
          userId: 101,
        },
      ];

      const result = await availabilityRepository.createMany({ data: createData });

      expect(prismaMock.availability.createMany).toHaveBeenCalledWith({
        data: createData,
      });
      expect(result).toEqual({ count: 2 });
    });

    it("should handle empty array", async () => {
      prismaMock.availability.createMany.mockResolvedValue({ count: 0 });

      const result = await availabilityRepository.createMany({ data: [] });

      expect(prismaMock.availability.createMany).toHaveBeenCalledWith({ data: [] });
      expect(result).toEqual({ count: 0 });
    });

    it("should propagate prisma errors", async () => {
      const error = new Error("Database connection failed");
      prismaMock.availability.createMany.mockRejectedValue(error);

      await expect(availabilityRepository.createMany({ data: [] })).rejects.toThrow(
        "Database connection failed"
      );
    });
  });
});
