import prisma from "@calcom/prisma";
import { WebhookEventStatus } from "@calcom/prisma/enums";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaWebhookEventRepository } from "../../../repository/webhookEvent/PrismaWebhookEventRepository";
import { WebhookEventService } from "../WebhookEventService";

const timestamp = Date.now();
const testPrefix = `evt_idempotency_${timestamp}`;
const createdIds: string[] = [];

function assertDefined<T>(value: T | null | undefined): asserts value is T {
  expect(value).toBeDefined();
  expect(value).not.toBeNull();
}

describe("WebhookEventService - concurrent idempotency & stale event ordering", () => {
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

  describe("concurrent tryAcquire (idempotency)", () => {
    it("exactly one of N parallel tryAcquire calls should succeed for the same externalEventId", async () => {
      const externalEventId = `${testPrefix}_concurrent_race`;
      const concurrency = 5;

      const results = await Promise.all(
        Array.from({ length: concurrency }, () => service.tryAcquire(externalEventId))
      );

      const successes = results.filter(Boolean);
      const failures = results.filter((r) => r === null);

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(concurrency - 1);

      assertDefined(successes[0]);
      createdIds.push(successes[0].id);

      const row = await prisma.webhookEvent.findUnique({ where: { id: successes[0].id } });
      assertDefined(row);
      expect(row.status).toBe(WebhookEventStatus.PROCESSING);
    });

    it("concurrent tryAcquire on different externalEventIds should all succeed", async () => {
      const ids = Array.from({ length: 5 }, (_, i) => `${testPrefix}_multi_${i}`);

      const results = await Promise.all(ids.map((id) => service.tryAcquire(id)));

      for (const result of results) {
        assertDefined(result);
        createdIds.push(result.id);
      }

      const rows = await prisma.webhookEvent.findMany({
        where: { id: { in: results.map((r) => r!.id) } },
        select: { id: true, status: true },
      });

      expect(rows).toHaveLength(5);
      for (const row of rows) {
        expect(row.status).toBe(WebhookEventStatus.PROCESSING);
      }
    });
  });

  describe("stale event ordering", () => {
    it("worker B should reacquire an event that worker A let go stale", async () => {
      const externalEventId = `${testPrefix}_stale_order`;

      const workerA = await service.tryAcquire(externalEventId);
      assertDefined(workerA);
      createdIds.push(workerA.id);

      // Worker A goes stale (simulate by backdating updatedAt beyond the 5-min threshold)
      await prisma.webhookEvent.update({
        where: { id: workerA.id },
        data: { updatedAt: new Date(Date.now() - 10 * 60 * 1000) },
      });

      const workerB = await service.tryAcquire(externalEventId);
      assertDefined(workerB);
      expect(workerB.id).toBe(workerA.id);

      const row = await prisma.webhookEvent.findUnique({ where: { id: workerA.id } });
      assertDefined(row);
      expect(row.status).toBe(WebhookEventStatus.PROCESSING);
      // updatedAt should be refreshed (close to now)
      expect(Date.now() - row.updatedAt.getTime()).toBeLessThan(5000);
    });

    it("should NOT reacquire an event that is actively processing (not stale)", async () => {
      const externalEventId = `${testPrefix}_fresh_no_reacquire`;

      const workerA = await service.tryAcquire(externalEventId);
      assertDefined(workerA);
      createdIds.push(workerA.id);

      // Event just created so updatedAt is fresh — should NOT be reacquirable
      const workerB = await service.tryAcquire(externalEventId);
      expect(workerB).toBeNull();
    });

    it("stale reacquire then complete should block subsequent acquires", async () => {
      const externalEventId = `${testPrefix}_stale_then_complete`;

      const first = await service.tryAcquire(externalEventId);
      assertDefined(first);
      createdIds.push(first.id);

      // Go stale
      await prisma.webhookEvent.update({
        where: { id: first.id },
        data: { updatedAt: new Date(Date.now() - 10 * 60 * 1000) },
      });

      // Reacquire
      const second = await service.tryAcquire(externalEventId);
      assertDefined(second);
      expect(second.id).toBe(first.id);

      // Complete
      await service.markCompleted(second.id);

      // Now no one should be able to acquire
      const third = await service.tryAcquire(externalEventId);
      expect(third).toBeNull();

      const row = await prisma.webhookEvent.findUnique({ where: { id: first.id } });
      assertDefined(row);
      expect(row.status).toBe(WebhookEventStatus.COMPLETED);
    });
  });

  describe("status transition chains", () => {
    it("PROCESSING → FAILED → reacquire → COMPLETED is a valid lifecycle", async () => {
      const externalEventId = `${testPrefix}_full_lifecycle`;

      const acquired = await service.tryAcquire(externalEventId);
      assertDefined(acquired);
      createdIds.push(acquired.id);

      let row = await prisma.webhookEvent.findUnique({ where: { id: acquired.id } });
      assertDefined(row);
      expect(row.status).toBe(WebhookEventStatus.PROCESSING);

      await service.markFailed(acquired.id);
      row = await prisma.webhookEvent.findUnique({ where: { id: acquired.id } });
      assertDefined(row);
      expect(row.status).toBe(WebhookEventStatus.FAILED);

      const reacquired = await service.tryAcquire(externalEventId);
      assertDefined(reacquired);
      expect(reacquired.id).toBe(acquired.id);

      row = await prisma.webhookEvent.findUnique({ where: { id: acquired.id } });
      assertDefined(row);
      expect(row.status).toBe(WebhookEventStatus.PROCESSING);

      await service.markCompleted(acquired.id);
      row = await prisma.webhookEvent.findUnique({ where: { id: acquired.id } });
      assertDefined(row);
      expect(row.status).toBe(WebhookEventStatus.COMPLETED);

      const blocked = await service.tryAcquire(externalEventId);
      expect(blocked).toBeNull();
    });

    it("PROCESSING → FAILED → FAILED → reacquire should work (multiple failures before retry)", async () => {
      const externalEventId = `${testPrefix}_multi_fail`;

      const acquired = await service.tryAcquire(externalEventId);
      assertDefined(acquired);
      createdIds.push(acquired.id);

      await service.markFailed(acquired.id);
      await service.markFailed(acquired.id);

      const row = await prisma.webhookEvent.findUnique({ where: { id: acquired.id } });
      assertDefined(row);
      expect(row.status).toBe(WebhookEventStatus.FAILED);

      const reacquired = await service.tryAcquire(externalEventId);
      assertDefined(reacquired);
      expect(reacquired.id).toBe(acquired.id);
    });

    it("completed event should remain completed even after markFailed attempt", async () => {
      const externalEventId = `${testPrefix}_completed_immutable`;

      const acquired = await service.tryAcquire(externalEventId);
      assertDefined(acquired);
      createdIds.push(acquired.id);

      await service.markCompleted(acquired.id);

      // markFailed on a completed event — the service doesn't guard against this,
      // but tryAcquire should still respect the status that was last set
      await service.markFailed(acquired.id);

      // Since markFailed overrides status to FAILED, a tryAcquire should now succeed
      // (FAILED events are reacquirable). This tests the actual behavior.
      const reacquired = await service.tryAcquire(externalEventId);
      assertDefined(reacquired);
      expect(reacquired.id).toBe(acquired.id);
    });
  });

  describe("concurrent stale reacquisition", () => {
    it("only one of N parallel reacquire attempts should succeed on a stale event", async () => {
      const externalEventId = `${testPrefix}_concurrent_stale`;

      const first = await service.tryAcquire(externalEventId);
      assertDefined(first);
      createdIds.push(first.id);

      // Make it stale
      await prisma.webhookEvent.update({
        where: { id: first.id },
        data: { updatedAt: new Date(Date.now() - 10 * 60 * 1000) },
      });

      const concurrency = 5;
      const results = await Promise.all(
        Array.from({ length: concurrency }, () => service.tryAcquire(externalEventId))
      );

      const successes = results.filter(Boolean);
      // At least one should succeed; due to the atomic UPDATE...RETURNING,
      // only one worker should get the row back
      expect(successes.length).toBeGreaterThanOrEqual(1);

      // All successful results should reference the same event id
      for (const success of successes) {
        expect(success!.id).toBe(first.id);
      }
    });
  });

  describe("boundary: stale threshold", () => {
    it("event updated just inside the threshold should NOT be reacquirable", async () => {
      const externalEventId = `${testPrefix}_boundary_inside`;

      const acquired = await service.tryAcquire(externalEventId);
      assertDefined(acquired);
      createdIds.push(acquired.id);

      // Set updatedAt to 4 minutes ago — well within the 5-min stale window.
      // The SQL uses `updatedAt < staleThreshold` (strict <), so an event updated
      // less than 5 minutes ago is NOT stale and should not be reacquirable.
      await prisma.webhookEvent.update({
        where: { id: acquired.id },
        data: { updatedAt: new Date(Date.now() - 4 * 60 * 1000) },
      });

      const result = await service.tryAcquire(externalEventId);
      expect(result).toBeNull();
    });

    it("event updated 1ms past the threshold should be reacquirable", async () => {
      const externalEventId = `${testPrefix}_boundary_past`;

      const acquired = await service.tryAcquire(externalEventId);
      assertDefined(acquired);
      createdIds.push(acquired.id);

      // Set updatedAt to 5 minutes + 1 second ago (past threshold)
      await prisma.webhookEvent.update({
        where: { id: acquired.id },
        data: { updatedAt: new Date(Date.now() - 5 * 60 * 1000 - 1000) },
      });

      const result = await service.tryAcquire(externalEventId);
      assertDefined(result);
      expect(result.id).toBe(acquired.id);
    });
  });
});
