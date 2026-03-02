import prisma from "@calcom/prisma";
import type { PrismaClient } from "@calcom/prisma/client";
import { IdentityProvider } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHandler } from "./create.handler";
import { deleteHandler } from "./delete.handler";
import { editHandler } from "./edit.handler";
import { listHandler } from "./list.handler";

describe("apiKeys handlers integration", () => {
  const timestamp = Date.now();
  let userId: number;
  const createdApiKeyIds: string[] = [];

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        username: `apikeys-user-${timestamp}`,
        email: `apikeys-user-${timestamp}@example.com`,
        name: "API Keys Test User",
        identityProvider: IdentityProvider.CAL,
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    try {
      // Clean up any API keys created during tests
      if (createdApiKeyIds.length > 0) {
        await prisma.apiKey.deleteMany({
          where: { id: { in: createdApiKeyIds } },
        });
      }
      // Clean up user's remaining API keys (in case IDs weren't tracked)
      await prisma.apiKey.deleteMany({
        where: { userId },
      });
      await prisma.user.deleteMany({
        where: { id: userId },
      });
    } catch (error) {
      console.warn("Test cleanup failed:", error);
    }
  });

  describe("listHandler", () => {
    it("should return empty list for user with no API keys", async () => {
      const ctx = {
        user: { id: userId } as NonNullable<TrpcSessionUser>,
        prisma: prisma as PrismaClient,
      };

      const result = await listHandler({ ctx });
      expect(result).toEqual([]);
    });

    it("should return API keys after creation", async () => {
      // Create an API key directly in DB for the list test
      const apiKey = await prisma.apiKey.create({
        data: {
          userId,
          note: `list-test-key-${timestamp}`,
          hashedKey: `hashed-list-${timestamp}`,
        },
      });
      createdApiKeyIds.push(apiKey.id);

      const ctx = {
        user: { id: userId } as NonNullable<TrpcSessionUser>,
        prisma: prisma as PrismaClient,
      };

      const result = await listHandler({ ctx });
      expect(result.length).toBeGreaterThanOrEqual(1);

      const found = result.find((k: { id: string }) => k.id === apiKey.id);
      expect(found).toBeTruthy();
    });
  });

  describe("createHandler", () => {
    it("should create a personal API key with a note", async () => {
      const ctx = {
        user: { id: userId } as NonNullable<TrpcSessionUser>,
      };

      const result = await createHandler({
        ctx,
        input: {
          note: `create-test-${timestamp}`,
          neverExpires: true,
        },
      });

      // createHandler returns the prefixed API key string
      expect(typeof result).toBe("string");
      expect(result.startsWith("cal_")).toBe(true);

      // Find the created key in the DB to track for cleanup
      const dbKeys = await prisma.apiKey.findMany({
        where: { userId, note: `create-test-${timestamp}` },
      });
      expect(dbKeys.length).toBe(1);
      createdApiKeyIds.push(dbKeys[0].id);
    });

    it("should create an API key with expiration date", async () => {
      const ctx = {
        user: { id: userId } as NonNullable<TrpcSessionUser>,
      };

      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      const result = await createHandler({
        ctx,
        input: {
          note: `expiring-key-${timestamp}`,
          expiresAt,
          neverExpires: false,
        },
      });

      expect(typeof result).toBe("string");

      const dbKeys = await prisma.apiKey.findMany({
        where: { userId, note: `expiring-key-${timestamp}` },
      });
      expect(dbKeys.length).toBe(1);
      expect(dbKeys[0].expiresAt).toBeTruthy();
      createdApiKeyIds.push(dbKeys[0].id);
    });

    it("should set expiresAt to null when neverExpires is true", async () => {
      const ctx = {
        user: { id: userId } as NonNullable<TrpcSessionUser>,
      };

      await createHandler({
        ctx,
        input: {
          note: `never-expires-key-${timestamp}`,
          neverExpires: true,
          expiresAt: new Date(), // Should be ignored because neverExpires is true
        },
      });

      const dbKeys = await prisma.apiKey.findMany({
        where: { userId, note: `never-expires-key-${timestamp}` },
      });
      expect(dbKeys.length).toBe(1);
      expect(dbKeys[0].expiresAt).toBeNull();
      createdApiKeyIds.push(dbKeys[0].id);
    });
  });

  describe("deleteHandler", () => {
    it("should delete an API key belonging to the user", async () => {
      // Create a key to delete
      const apiKey = await prisma.apiKey.create({
        data: {
          userId,
          note: `delete-test-${timestamp}`,
          hashedKey: `hashed-delete-${timestamp}`,
        },
      });

      const ctx = {
        user: { id: userId } as NonNullable<TrpcSessionUser>,
      };

      const result = await deleteHandler({
        ctx,
        input: { id: apiKey.id },
      });

      expect(result.id).toBe(apiKey.id);

      // Verify it's actually deleted
      const deletedKey = await prisma.apiKey.findUnique({
        where: { id: apiKey.id },
      });
      expect(deletedKey).toBeNull();
    });

    it("should delete zapier webhooks when deleting a zapier API key", async () => {
      // Create a zapier API key
      const zapierKey = await prisma.apiKey.create({
        data: {
          userId,
          note: `zapier-key-${timestamp}`,
          hashedKey: `hashed-zapier-${timestamp}`,
          appId: "zapier",
        },
      });

      // Create a zapier webhook for this user
      await prisma.webhook.create({
        data: {
          id: `test-zapier-webhook-${timestamp}`,
          userId,
          subscriberUrl: `https://hooks.zapier.com/test-${timestamp}`,
          eventTriggers: [],
          appId: "zapier",
        },
      });

      const ctx = {
        user: { id: userId } as NonNullable<TrpcSessionUser>,
      };

      await deleteHandler({
        ctx,
        input: { id: zapierKey.id },
      });

      // Verify zapier webhooks are also deleted
      const remainingZapierWebhooks = await prisma.webhook.findMany({
        where: { userId, appId: "zapier" },
      });
      expect(remainingZapierWebhooks.length).toBe(0);
    });
  });

  describe("editHandler", () => {
    it("should update an API key note", async () => {
      const apiKey = await prisma.apiKey.create({
        data: {
          userId,
          note: `edit-test-original-${timestamp}`,
          hashedKey: `hashed-edit-${timestamp}`,
        },
      });
      createdApiKeyIds.push(apiKey.id);

      const ctx = {
        user: { id: userId } as NonNullable<TrpcSessionUser>,
      };

      const updatedNote = `edit-test-updated-${timestamp}`;
      const result = await editHandler({
        ctx,
        input: { id: apiKey.id, note: updatedNote },
      });

      expect(result.note).toBe(updatedNote);
      expect(result.id).toBe(apiKey.id);
    });

    it("should update an API key expiration date", async () => {
      const apiKey = await prisma.apiKey.create({
        data: {
          userId,
          note: `edit-expiry-test-${timestamp}`,
          hashedKey: `hashed-edit-expiry-${timestamp}`,
        },
      });
      createdApiKeyIds.push(apiKey.id);

      const ctx = {
        user: { id: userId } as NonNullable<TrpcSessionUser>,
      };

      const newExpiry = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days
      const result = await editHandler({
        ctx,
        input: { id: apiKey.id, expiresAt: newExpiry },
      });

      expect(result.id).toBe(apiKey.id);
      expect(result.expiresAt).toBeTruthy();
    });
  });
});
