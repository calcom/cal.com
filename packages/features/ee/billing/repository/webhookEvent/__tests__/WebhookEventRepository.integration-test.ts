import prisma from "@calcom/prisma";
import { WebhookEventStatus } from "@calcom/prisma/enums";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaWebhookEventRepository } from "../PrismaWebhookEventRepository";

const timestamp = Date.now();
const testPrefix = `evt_repo_test_${timestamp}`;
const createdIds: string[] = [];

function assertDefined<T>(value: T | null | undefined): asserts value is T {
  expect(value).toBeDefined();
  expect(value).not.toBeNull();
}

describe("PrismaWebhookEventRepository - integration", () => {
  let repository: PrismaWebhookEventRepository;

  beforeAll(() => {
    repository = new PrismaWebhookEventRepository(prisma);
  });

  afterAll(async () => {
    if (createdIds.length > 0) {
      await prisma.webhookEvent.deleteMany({ where: { id: { in: createdIds } } });
    }
    await prisma.webhookEvent.deleteMany({
      where: { externalEventId: { startsWith: testPrefix } },
    });
  });

  describe("create", () => {
    it("creates a new webhook event with PROCESSING status", async () => {
      const externalEventId = `${testPrefix}_create`;
      const result = await repository.create(externalEventId);
      assertDefined(result);
      createdIds.push(result.id);

      const row = await prisma.webhookEvent.findUnique({ where: { id: result.id } });
      assertDefined(row);
      expect(row.externalEventId).toBe(externalEventId);
      expect(row.status).toBe(WebhookEventStatus.PROCESSING);
    });

    it("returns null on duplicate externalEventId", async () => {
      const externalEventId = `${testPrefix}_dup`;
      const first = await repository.create(externalEventId);
      assertDefined(first);
      createdIds.push(first.id);

      const second = await repository.create(externalEventId);
      expect(second).toBeNull();
    });
  });

  describe("updateStatus", () => {
    it("updates status to COMPLETED", async () => {
      const externalEventId = `${testPrefix}_complete`;
      const created = await repository.create(externalEventId);
      assertDefined(created);
      createdIds.push(created.id);

      await repository.updateStatus(created.id, WebhookEventStatus.COMPLETED);

      const row = await prisma.webhookEvent.findUnique({ where: { id: created.id } });
      assertDefined(row);
      expect(row.status).toBe(WebhookEventStatus.COMPLETED);
    });

    it("updates status to FAILED", async () => {
      const externalEventId = `${testPrefix}_fail`;
      const created = await repository.create(externalEventId);
      assertDefined(created);
      createdIds.push(created.id);

      await repository.updateStatus(created.id, WebhookEventStatus.FAILED);

      const row = await prisma.webhookEvent.findUnique({ where: { id: created.id } });
      assertDefined(row);
      expect(row.status).toBe(WebhookEventStatus.FAILED);
    });
  });

  describe("reacquireStale", () => {
    it("reacquires a stale PROCESSING event", async () => {
      const externalEventId = `${testPrefix}_stale`;
      const created = await repository.create(externalEventId);
      assertDefined(created);
      createdIds.push(created.id);

      await prisma.webhookEvent.update({
        where: { id: created.id },
        data: { updatedAt: new Date(Date.now() - 10 * 60 * 1000) },
      });

      const staleThreshold = new Date(Date.now() - 5 * 60 * 1000);
      const result = await repository.reacquireStale(externalEventId, staleThreshold);
      assertDefined(result);
      expect(result.id).toBe(created.id);
    });

    it("returns null for a recently active PROCESSING event", async () => {
      const externalEventId = `${testPrefix}_active`;
      const created = await repository.create(externalEventId);
      assertDefined(created);
      createdIds.push(created.id);

      const staleThreshold = new Date(Date.now() - 5 * 60 * 1000);
      const result = await repository.reacquireStale(externalEventId, staleThreshold);
      expect(result).toBeNull();
    });

    it("reacquires a FAILED event", async () => {
      const externalEventId = `${testPrefix}_failed_reacq`;
      const created = await repository.create(externalEventId);
      assertDefined(created);
      createdIds.push(created.id);

      await repository.updateStatus(created.id, WebhookEventStatus.FAILED);

      const staleThreshold = new Date(Date.now() - 5 * 60 * 1000);
      const result = await repository.reacquireStale(externalEventId, staleThreshold);
      assertDefined(result);
      expect(result.id).toBe(created.id);

      const row = await prisma.webhookEvent.findUnique({ where: { id: created.id } });
      assertDefined(row);
      expect(row.status).toBe(WebhookEventStatus.PROCESSING);
    });

    it("returns null for a COMPLETED event", async () => {
      const externalEventId = `${testPrefix}_completed_skip`;
      const created = await repository.create(externalEventId);
      assertDefined(created);
      createdIds.push(created.id);

      await repository.updateStatus(created.id, WebhookEventStatus.COMPLETED);

      await prisma.webhookEvent.update({
        where: { id: created.id },
        data: { updatedAt: new Date(Date.now() - 10 * 60 * 1000) },
      });

      const staleThreshold = new Date(Date.now() - 5 * 60 * 1000);
      const result = await repository.reacquireStale(externalEventId, staleThreshold);
      expect(result).toBeNull();
    });
  });
});
