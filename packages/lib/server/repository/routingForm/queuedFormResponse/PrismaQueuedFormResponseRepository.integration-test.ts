import { describe, expect, beforeAll, afterAll, beforeEach, it } from "vitest";

import prisma from "@calcom/prisma";

import { PrismaQueuedFormResponseRepository } from "./PrismaQueuedFormResponseRepository";

const repository = new PrismaQueuedFormResponseRepository(prisma);

describe("PrismaQueuedFormResponseRepository Integration Tests", () => {
  let testForm: { id: string };
  let testUser: { id: number };
  let testFormResponse: { id: number };
  let testResponses: Array<{ id: string; actualResponseId: number | null; createdAt: Date }> = [];

  beforeAll(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: `test-qfr-${Date.now()}@example.com`,
        username: `test-qfr-${Date.now()}`,
      },
    });

    // Create test form
    testForm = await prisma.app_RoutingForms_Form.create({
      data: {
        name: `Test Form ${Date.now()}`,
        userId: testUser.id,
        fields: [],
        routes: [],
        settings: {},
      },
    });

    // Create test form response for actualResponseId references
    testFormResponse = await prisma.app_RoutingForms_FormResponse.create({
      data: {
        formId: testForm.id,
        response: { test: "response" },
        chosenRouteId: "test-route-id",
      },
    });
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
    await prisma.app_RoutingForms_QueuedFormResponse.deleteMany({
      where: { formId: testForm.id },
    });
    testResponses = [];
  });

  describe("findMany", () => {
    it("should find queued responses by actualResponseId", async () => {
      // Create additional form responses for testing
      const formResponse1 = await prisma.app_RoutingForms_FormResponse.create({
        data: {
          formId: testForm.id,
          response: { field1: "form-response-1" },
          chosenRouteId: "test-route-id",
        },
      });

      const formResponse2 = await prisma.app_RoutingForms_FormResponse.create({
        data: {
          formId: testForm.id,
          response: { field1: "form-response-2" },
          chosenRouteId: "test-route-id",
        },
      });

      // Create test queued responses
      const queuedResponse1 = await prisma.app_RoutingForms_QueuedFormResponse.create({
        data: {
          formId: testForm.id,
          response: { field1: "value1" },
          chosenRouteId: "test-route-id",
          actualResponseId: formResponse1.id,
        },
      });

      const queuedResponse2 = await prisma.app_RoutingForms_QueuedFormResponse.create({
        data: {
          formId: testForm.id,
          response: { field1: "value2" },
          chosenRouteId: "test-route-id",
          actualResponseId: formResponse2.id,
        },
      });

      const queuedResponse3 = await prisma.app_RoutingForms_QueuedFormResponse.create({
        data: {
          formId: testForm.id,
          response: { field1: "value3" },
          chosenRouteId: "test-route-id",
          actualResponseId: null,
        },
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
      await prisma.app_RoutingForms_QueuedFormResponse.create({
        data: {
          formId: testForm.id,
          response: { field1: "value1" },
          chosenRouteId: "test-route-id",
          actualResponseId: testFormResponse.id,
        },
      });

      const queuedResponse2 = await prisma.app_RoutingForms_QueuedFormResponse.create({
        data: {
          formId: testForm.id,
          response: { field1: "value2" },
          chosenRouteId: "test-route-id",
          actualResponseId: null,
        },
      });

      const queuedResponse3 = await prisma.app_RoutingForms_QueuedFormResponse.create({
        data: {
          formId: testForm.id,
          response: { field1: "value3" },
          chosenRouteId: "test-route-id",
          actualResponseId: null,
        },
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
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      // Create responses with specific timestamps
      const oldResponse1 = await prisma.app_RoutingForms_QueuedFormResponse.create({
        data: {
          formId: testForm.id,
          response: { field1: "old1" },
          chosenRouteId: "test-route-id",
          createdAt: twoDaysAgo,
        },
      });

      const oldResponse2 = await prisma.app_RoutingForms_QueuedFormResponse.create({
        data: {
          formId: testForm.id,
          response: { field1: "old2" },
          chosenRouteId: "test-route-id",
          createdAt: twoDaysAgo,
        },
      });

      const recentResponse = await prisma.app_RoutingForms_QueuedFormResponse.create({
        data: {
          formId: testForm.id,
          response: { field1: "recent" },
          chosenRouteId: "test-route-id",
          createdAt: now,
        },
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
      for (let i = 0; i < 5; i++) {
        const response = await prisma.app_RoutingForms_QueuedFormResponse.create({
          data: {
            formId: testForm.id,
            response: { field1: `value${i}` },
            chosenRouteId: "test-route-id",
            actualResponseId: null,
          },
        });
        testResponses.push(response);
      }

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
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      const oldWithNull = await prisma.app_RoutingForms_QueuedFormResponse.create({
        data: {
          formId: testForm.id,
          response: { field1: "old-null" },
          chosenRouteId: "test-route-id",
          actualResponseId: null,
          createdAt: twoDaysAgo,
        },
      });

      await prisma.app_RoutingForms_QueuedFormResponse.create({
        data: {
          formId: testForm.id,
          response: { field1: "old-with-id" },
          chosenRouteId: "test-route-id",
          actualResponseId: testFormResponse.id,
          createdAt: twoDaysAgo,
        },
      });

      await prisma.app_RoutingForms_QueuedFormResponse.create({
        data: {
          formId: testForm.id,
          response: { field1: "recent-null" },
          chosenRouteId: "test-route-id",
          actualResponseId: null,
          createdAt: now,
        },
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
      const formResponseForTest = await prisma.app_RoutingForms_FormResponse.create({
        data: {
          formId: testForm.id,
          response: { field1: "form-response-test" },
          chosenRouteId: "test-route-id",
        },
      });

      const response = await prisma.app_RoutingForms_QueuedFormResponse.create({
        data: {
          formId: testForm.id,
          response: { field1: "test-value" },
          chosenRouteId: "test-route-id",
          actualResponseId: formResponseForTest.id,
        },
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
      const expectedKeys = ["id", "formId", "response", "chosenRouteId", "createdAt", "updatedAt", "actualResponseId"];
      expect(Object.keys(foundResponse).sort()).toEqual(expectedKeys.sort());
    });
  });

  describe("deleteByIds", () => {
    it("should delete queued responses by their ids", async () => {
      // Create test queued responses
      const response1 = await prisma.app_RoutingForms_QueuedFormResponse.create({
        data: {
          formId: testForm.id,
          response: { field1: "value1" },
          chosenRouteId: "test-route-id",
        },
      });

      const response2 = await prisma.app_RoutingForms_QueuedFormResponse.create({
        data: {
          formId: testForm.id,
          response: { field1: "value2" },
          chosenRouteId: "test-route-id",
        },
      });

      const response3 = await prisma.app_RoutingForms_QueuedFormResponse.create({
        data: {
          formId: testForm.id,
          response: { field1: "value3" },
          chosenRouteId: "test-route-id",
        },
      });

      // Delete response1 and response2
      const result = await repository.deleteByIds([response1.id, response2.id]);
      
      expect(result.count).toBe(2);

      // Verify only response3 remains
      const remaining = await prisma.app_RoutingForms_QueuedFormResponse.findMany({
        where: { formId: testForm.id },
      });

      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(response3.id);
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
      const response = await prisma.app_RoutingForms_QueuedFormResponse.create({
        data: {
          formId: testForm.id,
          response: { field1: "single-delete" },
          chosenRouteId: "test-route-id",
        },
      });

      const result = await repository.deleteByIds([response.id]);
      
      expect(result.count).toBe(1);

      // Verify it's deleted
      const found = await prisma.app_RoutingForms_QueuedFormResponse.findUnique({
        where: { id: response.id },
      });
      expect(found).toBeNull();
    });

    it("should handle mix of existing and non-existing ids", async () => {
      const response = await prisma.app_RoutingForms_QueuedFormResponse.create({
        data: {
          formId: testForm.id,
          response: { field1: "mixed-delete" },
          chosenRouteId: "test-route-id",
        },
      });

      const result = await repository.deleteByIds([response.id, "non-existent-id"]);
      
      expect(result.count).toBe(1);
    });
  });
});