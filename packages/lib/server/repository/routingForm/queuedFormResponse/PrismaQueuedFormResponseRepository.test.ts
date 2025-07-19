import prismaMock from "../../../../../../tests/libs/__mocks__/prismaMock";

import { it, describe, expect, vi, beforeEach } from "vitest";

import { PrismaQueuedFormResponseRepository } from "./PrismaQueuedFormResponseRepository";

describe("PrismaQueuedFormResponseRepository", () => {
  let repository: PrismaQueuedFormResponseRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new PrismaQueuedFormResponseRepository(prismaMock);
  });

  describe("findMany", () => {
    it("should find queued form responses with where clause", async () => {
      const cutoffTime = new Date("2024-01-01T00:00:00Z");
      const mockResponses = [{ id: "1" }, { id: "2" }, { id: "3" }];

      prismaMock.app_RoutingForms_QueuedFormResponse.findMany.mockResolvedValue(mockResponses);

      const result = await repository.findMany({
        where: {
          actualResponseId: null,
          createdAt: {
            lt: cutoffTime,
          },
        },
        params: {
          take: 100,
        },
      });

      expect(prismaMock.app_RoutingForms_QueuedFormResponse.findMany).toHaveBeenCalledWith({
        where: {
          actualResponseId: null,
          createdAt: {
            lt: cutoffTime,
          },
        },
        select: {
          id: true,
          formId: true,
          response: true,
          chosenRouteId: true,
          createdAt: true,
          updatedAt: true,
          actualResponseId: true,
        },
        take: 100,
      });

      expect(result).toEqual(mockResponses);
    });

    it("should find queued form responses without params", async () => {
      const cutoffTime = new Date("2024-01-01T00:00:00Z");
      const mockResponses = [{ id: "1" }, { id: "2" }];

      prismaMock.app_RoutingForms_QueuedFormResponse.findMany.mockResolvedValue(mockResponses);

      const result = await repository.findMany({
        where: {
          actualResponseId: null,
          createdAt: {
            lt: cutoffTime,
          },
        },
      });

      expect(prismaMock.app_RoutingForms_QueuedFormResponse.findMany).toHaveBeenCalledWith({
        where: {
          actualResponseId: null,
          createdAt: {
            lt: cutoffTime,
          },
        },
        select: {
          id: true,
          formId: true,
          response: true,
          chosenRouteId: true,
          createdAt: true,
          updatedAt: true,
          actualResponseId: true,
        },
      });

      expect(result).toEqual(mockResponses);
    });

    it("should throw error when where clause is empty", async () => {
      await expect(
        repository.findMany({
          where: {},
        })
      ).rejects.toThrow("where is empty");

      expect(prismaMock.app_RoutingForms_QueuedFormResponse.findMany).not.toHaveBeenCalled();
    });

    it("should throw error when where clause has only undefined values", async () => {
      await expect(
        repository.findMany({
          where: {
            actualResponseId: undefined,
            createdAt: undefined,
          },
        })
      ).rejects.toThrow("where is empty");

      expect(prismaMock.app_RoutingForms_QueuedFormResponse.findMany).not.toHaveBeenCalled();
    });

    it("should find queued form responses with only actualResponseId filter", async () => {
      const mockResponses = [{ id: "1" }];

      prismaMock.app_RoutingForms_QueuedFormResponse.findMany.mockResolvedValue(mockResponses);

      const result = await repository.findMany({
        where: {
          actualResponseId: "response123",
        },
      });

      expect(prismaMock.app_RoutingForms_QueuedFormResponse.findMany).toHaveBeenCalledWith({
        where: {
          actualResponseId: "response123",
        },
        select: {
          id: true,
          formId: true,
          response: true,
          chosenRouteId: true,
          createdAt: true,
          updatedAt: true,
          actualResponseId: true,
        },
      });

      expect(result).toEqual(mockResponses);
    });

    it("should find queued form responses with only createdAt filter", async () => {
      const cutoffTime = new Date("2024-01-01T00:00:00Z");
      const mockResponses = [{ id: "1" }];

      prismaMock.app_RoutingForms_QueuedFormResponse.findMany.mockResolvedValue(mockResponses);

      const result = await repository.findMany({
        where: {
          createdAt: {
            lt: cutoffTime,
          },
        },
      });

      expect(prismaMock.app_RoutingForms_QueuedFormResponse.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            lt: cutoffTime,
          },
        },
        select: {
          id: true,
          formId: true,
          response: true,
          chosenRouteId: true,
          createdAt: true,
          updatedAt: true,
          actualResponseId: true,
        },
      });

      expect(result).toEqual(mockResponses);
    });
  });

  describe("deleteByIds", () => {
    it("should delete queued form responses by their IDs", async () => {
      const ids = ["id1", "id2", "id3"];
      const mockDeleteResult = { count: 3 };

      prismaMock.app_RoutingForms_QueuedFormResponse.deleteMany.mockResolvedValue(mockDeleteResult);

      const result = await repository.deleteByIds(ids);

      expect(prismaMock.app_RoutingForms_QueuedFormResponse.deleteMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: ids,
          },
        },
      });

      expect(result).toEqual(mockDeleteResult);
    });

    it("should handle empty array of IDs", async () => {
      const mockDeleteResult = { count: 0 };

      prismaMock.app_RoutingForms_QueuedFormResponse.deleteMany.mockResolvedValue(mockDeleteResult);

      const result = await repository.deleteByIds([]);

      expect(prismaMock.app_RoutingForms_QueuedFormResponse.deleteMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: [],
          },
        },
      });

      expect(result).toEqual(mockDeleteResult);
    });
  });
});
