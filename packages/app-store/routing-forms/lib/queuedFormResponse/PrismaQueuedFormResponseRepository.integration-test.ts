import { describe, expect, beforeAll, afterAll, beforeEach, it } from "vitest";

import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

import { PrismaQueuedFormResponseRepository } from "./PrismaQueuedFormResponseRepository";

const repository = new PrismaQueuedFormResponseRepository(prisma);

// Test Data Builders
const createTestUser = async (overrides?: { email?: string; username?: string }) => {
  const timestamp = Date.now();
  return prisma.user.create({
    data: {
      email: overrides?.email || `test-qfr-${timestamp}@example.com`,
      username: overrides?.username || `test-qfr-${timestamp}`,
    },
  });
};

const createTestForm = async (userId: number, overrides?: { name?: string }) => {
  return prisma.app_RoutingForms_Form.create({
    data: {
      name: overrides?.name || `Test Form ${Date.now()}`,
      userId,
      fields: [],
      routes: [],
      settings: {},
    },
  });
};

const createFormResponse = async (
  formId: string,
  overrides?: {
    response?: Prisma.InputJsonValue;
    chosenRouteId?: string;
  }
) => {
  return prisma.app_RoutingForms_FormResponse.create({
    data: {
      formId,
      response: overrides?.response || { test: "response" },
      chosenRouteId: overrides?.chosenRouteId || "test-route-id",
    },
  });
};

const createQueuedResponse = async (
  formId: string,
  overrides?: {
    response?: Prisma.InputJsonValue;
    chosenRouteId?: string;
    actualResponseId?: number | null;
    createdAt?: Date;
  }
) => {
  return prisma.app_RoutingForms_QueuedFormResponse.create({
    data: {
      formId,
      response: overrides?.response || { field1: "value" },
      chosenRouteId: overrides?.chosenRouteId || "test-route-id",
      actualResponseId: overrides?.actualResponseId ?? null,
      ...(overrides?.createdAt && { createdAt: overrides.createdAt }),
    },
  });
};

const createQueuedResponsesBatch = async (
  formId: string,
  count: number,
  baseOverrides?: Parameters<typeof createQueuedResponse>[1]
) => {
  const responses = [];
  for (let i = 0; i < count; i++) {
    const response = await createQueuedResponse(formId, {
      ...baseOverrides,
      response: { field1: `value${i}` },
    });
    responses.push(response);
  }
  return responses;
};

// Date Helpers
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

// Assertion Helpers
const expectQueuedResponseCount = async (formId: string, expectedCount: number) => {
  const count = await prisma.app_RoutingForms_QueuedFormResponse.count({
    where: { formId },
  });
  expect(count).toBe(expectedCount);
};

const expectQueuedResponseExists = async (responseId: string) => {
  const response = await prisma.app_RoutingForms_QueuedFormResponse.findUnique({
    where: { id: responseId },
  });
  expect(response).not.toBeNull();
};

const expectQueuedResponseNotExists = async (responseId: string) => {
  const response = await prisma.app_RoutingForms_QueuedFormResponse.findUnique({
    where: { id: responseId },
  });
  expect(response).toBeNull();
};

const expectResponseFields = (response: unknown) => {
  const expectedFields = [
    "id",
    "formId",
    "response",
    "chosenRouteId",
    "createdAt",
    "updatedAt",
    "actualResponseId",
  ];
  expectedFields.forEach((field) => {
    expect(response).toHaveProperty(field);
  });
  expect(Object.keys(response as object).sort()).toEqual(expectedFields.sort());
};

// Cleanup Helpers
const cleanupQueuedResponses = async (formId: string) => {
  await prisma.app_RoutingForms_QueuedFormResponse.deleteMany({
    where: { formId },
  });
};

describe("PrismaQueuedFormResponseRepository Integration Tests", () => {
  let testForm: { id: string };
  let testUser: { id: number };
  let testFormResponse: { id: number };
  let testResponses: Array<{ id: string; actualResponseId: number | null; createdAt: Date }> = [];

  beforeAll(async () => {
    // Create test user
    testUser = await createTestUser();

    // Create test form
    testForm = await createTestForm(testUser.id);

    // Create test form response for actualResponseId references
    testFormResponse = await createFormResponse(testForm.id);
  });

  afterAll(async () => {
    // Clean up all test data
    await prisma.app_RoutingForms_QueuedFormResponse.deleteMany({
      where: { formId: testForm.id },
    });
    await prisma.app_RoutingForms_FormResponse.deleteMany({
      where: { formId: testForm.id },
    });
    await prisma.app_RoutingForms_Form.delete({
      where: { id: testForm.id },
    });
    await prisma.user.delete({
      where: { id: testUser.id },
    });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clear queued responses before each test
    await cleanupQueuedResponses(testForm.id);
    testResponses = [];
  });

  describe("findMany", () => {
    it("should find queued responses by actualResponseId", async () => {
      // Create additional form responses for testing
      const formResponse1 = await createFormResponse(testForm.id, {
        response: { field1: "form-response-1" },
      });
      const formResponse2 = await createFormResponse(testForm.id, {
        response: { field1: "form-response-2" },
      });

      // Create test queued responses
      const queuedResponse1 = await createQueuedResponse(testForm.id, {
        response: { field1: "value1" },
        actualResponseId: formResponse1.id,
      });

      const queuedResponse2 = await createQueuedResponse(testForm.id, {
        response: { field1: "value2" },
        actualResponseId: formResponse2.id,
      });

      const queuedResponse3 = await createQueuedResponse(testForm.id, {
        response: { field1: "value3" },
        actualResponseId: null,
      });

      testResponses.push(queuedResponse1, queuedResponse2, queuedResponse3);

      // Test finding by specific actualResponseId
      const result = await repository.findMany({
        where: { actualResponseId: formResponse1.id },
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(queuedResponse1.id);
      expect(result[0].actualResponseId).toBe(formResponse1.id);
      expect(result[0].formId).toBe(testForm.id);
      expect(result[0].response).toEqual({ field1: "value1" });
    });

    it("should find queued responses by actualResponseId null", async () => {
      // Create test queued responses
      await createQueuedResponse(testForm.id, {
        response: { field1: "value1" },
        actualResponseId: testFormResponse.id,
      });

      const queuedResponse2 = await createQueuedResponse(testForm.id, {
        response: { field1: "value2" },
        actualResponseId: null,
      });

      const queuedResponse3 = await createQueuedResponse(testForm.id, {
        response: { field1: "value3" },
        actualResponseId: null,
      });

      // Test finding by actualResponseId null
      const result = await repository.findMany({
        where: { actualResponseId: null },
      });

      expect(result).toHaveLength(2);
      const resultIds = result.map((r) => r.id).sort();
      const expectedIds = [queuedResponse2.id, queuedResponse3.id].sort();
      expect(resultIds).toEqual(expectedIds);
    });

    it("should find queued responses created before a specific date", async () => {
      // Create test queued responses with different timestamps
      const now = new Date();
      const oneDayAgo = daysAgo(1);
      const twoDaysAgo = daysAgo(2);

      // Create responses with specific timestamps
      const oldResponse1 = await createQueuedResponse(testForm.id, {
        response: { field1: "old1" },
        createdAt: twoDaysAgo,
      });

      const oldResponse2 = await createQueuedResponse(testForm.id, {
        response: { field1: "old2" },
        createdAt: twoDaysAgo,
      });

      const recentResponse = await createQueuedResponse(testForm.id, {
        response: { field1: "recent" },
        createdAt: now,
      });

      testResponses.push(oldResponse1, oldResponse2, recentResponse);

      // Test finding responses created before oneDayAgo
      const result = await repository.findMany({
        where: { createdAt: { lt: oneDayAgo } },
      });

      expect(result).toHaveLength(2);
      const resultIds = result.map((r) => r.id).sort();
      const expectedIds = [oldResponse1.id, oldResponse2.id].sort();
      expect(resultIds).toEqual(expectedIds);
    });

    it("should apply take parameter to limit results", async () => {
      // Create multiple test queued responses
      const responses = await createQueuedResponsesBatch(testForm.id, 5, { actualResponseId: null });
      testResponses.push(...responses);

      // Test with take parameter
      const result = await repository.findMany({
        where: { actualResponseId: null },
        params: { take: 3 },
      });

      expect(result).toHaveLength(3);
    });

    it("should handle combined where conditions", async () => {
      // Create test queued responses
      const now = new Date();
      const oneDayAgo = daysAgo(1);
      const twoDaysAgo = daysAgo(2);

      const oldWithNull = await createQueuedResponse(testForm.id, {
        response: { field1: "old-null" },
        actualResponseId: null,
        createdAt: twoDaysAgo,
      });

      await createQueuedResponse(testForm.id, {
        response: { field1: "old-with-id" },
        actualResponseId: testFormResponse.id,
        createdAt: twoDaysAgo,
      });

      await createQueuedResponse(testForm.id, {
        response: { field1: "recent-null" },
        actualResponseId: null,
        createdAt: now,
      });

      // Test finding old responses with null actualResponseId
      const result = await repository.findMany({
        where: {
          actualResponseId: null,
          createdAt: { lt: oneDayAgo },
        },
      });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(oldWithNull.id);
    });

    it("should throw error when where is empty", async () => {
      await expect(
        repository.findMany({
          where: {},
        })
      ).rejects.toThrow("where is empty");
    });

    it("should throw error when where has only undefined values", async () => {
      await expect(
        repository.findMany({
          where: {
            actualResponseId: undefined,
            createdAt: undefined,
          },
        })
      ).rejects.toThrow("where is empty");
    });

    it("should return empty array when no matches found", async () => {
      const result = await repository.findMany({
        where: { actualResponseId: 999999 },
      });

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it("should return all fields defined in safeSelect", async () => {
      const formResponseForTest = await createFormResponse(testForm.id, {
        response: { field1: "form-response-test" },
      });

      const response = await createQueuedResponse(testForm.id, {
        response: { field1: "test-value" },
        actualResponseId: formResponseForTest.id,
      });

      const result = await repository.findMany({
        where: { actualResponseId: formResponseForTest.id },
      });

      expect(result).toHaveLength(1);
      const foundResponse = result[0];

      // Verify all fields from safeSelect are present
      expect(foundResponse).toHaveProperty("id", response.id);
      expect(foundResponse).toHaveProperty("formId", response.formId);
      expect(foundResponse).toHaveProperty("response", response.response);
      expect(foundResponse).toHaveProperty("chosenRouteId", response.chosenRouteId);
      expect(foundResponse).toHaveProperty("createdAt");
      expect(foundResponse).toHaveProperty("updatedAt");
      expect(foundResponse).toHaveProperty("actualResponseId", response.actualResponseId);

      // Verify no extra fields are included
      expectResponseFields(foundResponse);
    });
  });

  describe("deleteByIds", () => {
    it("should delete queued responses by their ids", async () => {
      // Create test queued responses
      const response1 = await createQueuedResponse(testForm.id, {
        response: { field1: "value1" },
      });
      const response2 = await createQueuedResponse(testForm.id, {
        response: { field1: "value2" },
      });
      const response3 = await createQueuedResponse(testForm.id, {
        response: { field1: "value3" },
      });

      // Delete response1 and response2
      const result = await repository.deleteByIds([response1.id, response2.id]);

      expect(result.count).toBe(2);

      // Verify only response3 remains
      await expectQueuedResponseCount(testForm.id, 1);
      await expectQueuedResponseExists(response3.id);
    });

    it("should return count 0 when deleting non-existent ids", async () => {
      const result = await repository.deleteByIds(["non-existent-id-1", "non-existent-id-2"]);

      expect(result.count).toBe(0);
    });

    it("should handle empty array of ids", async () => {
      const result = await repository.deleteByIds([]);

      expect(result.count).toBe(0);
    });

    it("should handle single id deletion", async () => {
      const response = await createQueuedResponse(testForm.id, {
        response: { field1: "single-delete" },
      });

      const result = await repository.deleteByIds([response.id]);

      expect(result.count).toBe(1);

      // Verify it's deleted
      await expectQueuedResponseNotExists(response.id);
    });

    it("should handle mix of existing and non-existing ids", async () => {
      const response = await createQueuedResponse(testForm.id, {
        response: { field1: "mixed-delete" },
      });

      const result = await repository.deleteByIds([response.id, "non-existent-id"]);

      expect(result.count).toBe(1);
    });
  });
});
