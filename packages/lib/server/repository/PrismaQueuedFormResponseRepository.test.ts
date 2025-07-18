import prismaMock from "../../../../tests/libs/__mocks__/prismaMock";

import { it, describe, expect, vi, beforeEach } from "vitest";

import { PrismaQueuedFormResponseRepository } from "./PrismaQueuedFormResponseRepository";

describe("PrismaQueuedFormResponseRepository", () => {
  let repository: PrismaQueuedFormResponseRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new PrismaQueuedFormResponseRepository(prismaMock);
  });

  describe("findExpiredResponses", () => {
    it("should find expired queued form responses", async () => {
      const cutoffTime = new Date("2024-01-01T00:00:00Z");
      const mockResponses = [{ id: "1" }, { id: "2" }, { id: "3" }];

      prismaMock.app_RoutingForms_QueuedFormResponse.findMany.mockResolvedValue(mockResponses);

      const result = await repository.findExpiredResponses({
        cutoffTime,
        take: 100,
      });

      expect(prismaMock.app_RoutingForms_QueuedFormResponse.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              actualResponseId: null,
            },
            {
              createdAt: {
                lt: cutoffTime,
              },
            },
          ],
        },
        select: { id: true },
        take: 100,
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

  describe("findById", () => {
    it("should find a queued form response by ID", async () => {
      const mockResponse = {
        id: "123",
        formId: "form1",
        response: { field: "value" },
        chosenRouteId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        actualResponseId: null,
      };

      prismaMock.app_RoutingForms_QueuedFormResponse.findUnique.mockResolvedValue(mockResponse);

      const result = await repository.findById("123");

      expect(prismaMock.app_RoutingForms_QueuedFormResponse.findUnique).toHaveBeenCalledWith({
        where: {
          id: "123",
        },
      });

      expect(result).toEqual(mockResponse);
    });

    it("should return null when response not found", async () => {
      prismaMock.app_RoutingForms_QueuedFormResponse.findUnique.mockResolvedValue(null);

      const result = await repository.findById("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("should create a new queued form response", async () => {
      const createData = {
        formId: "form1",
        response: { field: "value" },
        chosenRouteId: "route1",
      };

      const mockCreatedResponse = {
        id: "new123",
        ...createData,
        createdAt: new Date(),
        updatedAt: new Date(),
        actualResponseId: null,
      };

      prismaMock.app_RoutingForms_QueuedFormResponse.create.mockResolvedValue(mockCreatedResponse);

      const result = await repository.create(createData);

      expect(prismaMock.app_RoutingForms_QueuedFormResponse.create).toHaveBeenCalledWith({
        data: {
          formId: createData.formId,
          response: createData.response,
          chosenRouteId: createData.chosenRouteId,
        },
      });

      expect(result).toEqual(mockCreatedResponse);
    });

    it("should handle null chosenRouteId", async () => {
      const createData = {
        formId: "form1",
        response: { field: "value" },
        chosenRouteId: null,
      };

      const mockCreatedResponse = {
        id: "new123",
        ...createData,
        createdAt: new Date(),
        updatedAt: new Date(),
        actualResponseId: null,
      };

      prismaMock.app_RoutingForms_QueuedFormResponse.create.mockResolvedValue(mockCreatedResponse);

      const result = await repository.create(createData);

      expect(prismaMock.app_RoutingForms_QueuedFormResponse.create).toHaveBeenCalledWith({
        data: {
          formId: createData.formId,
          response: createData.response,
          chosenRouteId: null,
        },
      });

      expect(result).toEqual(mockCreatedResponse);
    });
  });

  describe("findByIdIncludeForm", () => {
    it("should find a queued form response with form data", async () => {
      const mockResponse = {
        id: "123",
        formId: "form1",
        response: { field: "value" },
        chosenRouteId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        actualResponseId: null,
        form: {
          routes: [{ id: "route1" }],
          fields: [{ id: "field1" }],
        },
      };

      prismaMock.app_RoutingForms_QueuedFormResponse.findUnique.mockResolvedValue(mockResponse);

      const result = await repository.findByIdIncludeForm("123");

      expect(prismaMock.app_RoutingForms_QueuedFormResponse.findUnique).toHaveBeenCalledWith({
        where: {
          id: "123",
        },
        select: {
          id: true,
          formId: true,
          response: true,
          chosenRouteId: true,
          createdAt: true,
          updatedAt: true,
          actualResponseId: true,
          form: {
            select: {
              routes: true,
              fields: true,
            },
          },
        },
      });

      expect(result).toEqual(mockResponse);
    });

    it("should return null when response with form not found", async () => {
      prismaMock.app_RoutingForms_QueuedFormResponse.findUnique.mockResolvedValue(null);

      const result = await repository.findByIdIncludeForm("nonexistent");

      expect(result).toBeNull();
    });
  });
});