import prisma from "@calcom/prisma";
import { WebhookEventStatus } from "@calcom/prisma/enums";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaWebhookEventRepository } from "../../../repository/webhookEvent/PrismaWebhookEventRepository";
import { WebhookEventService } from "../WebhookEventService";

const timestamp = Date.now();
const testPrefix = `evt_svc_test_${timestamp}`;
const createdIds: string[] = [];

function assertDefined<T>(value: T | null | undefined): asserts value is T {
  expect(value).toBeDefined();
  expect(value).not.toBeNull();
}

describe("WebhookEventService - integration", () => {
  let service: WebhookEventService;

  beforeAll(() => {
    const repository = new PrismaWebhookEventRepository(prisma);
    service = new WebhookEventService({ webhookEventRepository: repository });
  });

  afterAll(async () => {
    if (createdIds.length > 0) {
      await prisma.webhookEvent.deleteMany({ where: { id: { in: createdIds } } });
    }
    await prisma.webhookEvent.deleteMany({
      where: { externalEventId: { startsWith: testPrefix } },
    });
  });

  describe("tryAcquire", () => {
    it("acquires a new event on first call", async () => {
      const externalEventId = `${testPrefix}_new`;
      const result = await service.tryAcquire(externalEventId);
      assertDefined(result);
      createdIds.push(result.id);

      const row = await prisma.webhookEvent.findUnique({ where: { id: result.id } });
      assertDefined(row);
      expect(row.status).toBe(WebhookEventStatus.PROCESSING);
    });

    it("returns null for a duplicate event that is actively processing", async () => {
      const externalEventId = `${testPrefix}_active_dup`;
      const first = await service.tryAcquire(externalEventId);
      assertDefined(first);
      createdIds.push(first.id);

      const second = await service.tryAcquire(externalEventId);
      expect(second).toBeNull();
    });

    it("reacquires a stale PROCESSING event", async () => {
      const externalEventId = `${testPrefix}_stale_svc`;
      const first = await service.tryAcquire(externalEventId);
      assertDefined(first);
      createdIds.push(first.id);

      await prisma.webhookEvent.update({
        where: { id: first.id },
        data: { updatedAt: new Date(Date.now() - 10 * 60 * 1000) },
      });

      const second = await service.tryAcquire(externalEventId);
      assertDefined(second);
      expect(second.id).toBe(first.id);
    });

    it("reacquires a FAILED event", async () => {
      const externalEventId = `${testPrefix}_failed_svc`;
      const first = await service.tryAcquire(externalEventId);
      assertDefined(first);
      createdIds.push(first.id);

      await service.markFailed(first.id);

      const second = await service.tryAcquire(externalEventId);
      assertDefined(second);
      expect(second.id).toBe(first.id);

      const row = await prisma.webhookEvent.findUnique({ where: { id: first.id } });
      assertDefined(row);
      expect(row.status).toBe(WebhookEventStatus.PROCESSING);
    });

    it("does not reacquire a COMPLETED event", async () => {
      const externalEventId = `${testPrefix}_completed_svc`;
      const first = await service.tryAcquire(externalEventId);
      assertDefined(first);
      createdIds.push(first.id);

      await service.markCompleted(first.id);

      const second = await service.tryAcquire(externalEventId);
      expect(second).toBeNull();
    });
  });

  describe("markCompleted", () => {
    it("transitions status to COMPLETED", async () => {
      const externalEventId = `${testPrefix}_mark_complete`;
      const record = await service.tryAcquire(externalEventId);
      assertDefined(record);
      createdIds.push(record.id);

      await service.markCompleted(record.id);

      const row = await prisma.webhookEvent.findUnique({ where: { id: record.id } });
      assertDefined(row);
      expect(row.status).toBe(WebhookEventStatus.COMPLETED);
    });
  });

  describe("markFailed", () => {
    it("transitions status to FAILED", async () => {
      const externalEventId = `${testPrefix}_mark_fail`;
      const record = await service.tryAcquire(externalEventId);
      assertDefined(record);
      createdIds.push(record.id);

      await service.markFailed(record.id);

      const row = await prisma.webhookEvent.findUnique({ where: { id: record.id } });
      assertDefined(row);
      expect(row.status).toBe(WebhookEventStatus.FAILED);
    });
  });
});
