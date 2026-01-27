/**
 * Mock factories for unit testing Cal.com services.
 *
 * These mocks allow you to test services in isolation without database dependencies.
 * Use them to mock infrastructure boundaries (tasker, logger, etc.) while testing
 * real business logic.
 *
 * @example
 * ```typescript
 * import { createMockTasker, createMockLogger, expectWebhookTaskQueued } from "@calcom/testing/lib/mocks";
 *
 * describe("MyService", () => {
 *   const mockTasker = createMockTasker();
 *   const mockLogger = createMockLogger();
 *
 *   // Use real service with mocked infrastructure
 *   const service = new MyService(mockTasker, mockLogger);
 *
 *   it("queues webhook task", async () => {
 *     await service.doSomething();
 *     expectWebhookTaskQueued(mockTasker, { triggerEvent: "BOOKING_CREATED" });
 *   });
 * });
 * ```
 */

export { createMockTasker, expectWebhookTaskQueued, expectWebhookTaskNotQueued, expectWebhookTasksQueuedCount, getQueuedWebhookTasks } from "./tasker";
export type { MockTasker } from "./tasker";

export { createMockLogger } from "./logger";
export type { MockLogger } from "./logger";
