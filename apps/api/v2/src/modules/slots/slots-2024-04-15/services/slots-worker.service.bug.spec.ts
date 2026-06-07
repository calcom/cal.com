import { EventEmitter } from "node:events";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { GetScheduleOptions } from "@calcom/platform-libraries/slots";

// ---------------------------------------------------------------------------
// Shape of the mocked Worker instances created inside the jest.mock factory.
// Defined here so helpers and tests share a single typed interface.
// ---------------------------------------------------------------------------
interface MockWorkerInstance extends EventEmitter {
  threadId: number;
  terminated: boolean;
  postMessage: jest.Mock;
  terminate: jest.Mock;
}

// Internal shape of SlotsWorkerService_2024_04_15 used to access private fields.
interface ServiceInternals {
  workerPool: MockWorkerInstance[];
  availableWorkers: MockWorkerInstance[];
}

// ---------------------------------------------------------------------------
// Mock node:worker_threads before any imports that reference it.
// The factory uses require() because jest.mock() is hoisted above imports.
// ---------------------------------------------------------------------------
jest.mock("node:worker_threads", () => {
  const { EventEmitter: EE } = require("node:events");

  class MockWorker extends EE {
    static _nextId = 0;
    static _instances: MockWorker[] = [];

    threadId: number;
    terminated = false;

    // Use regular functions (not arrows) so `this` refers to the instance.
    postMessage = jest.fn();
    terminate = jest.fn(function (this: MockWorker): Promise<void> {
      this.terminated = true;
      return Promise.resolve();
    });

    constructor(_filePath: string) {
      super();
      this.threadId = ++MockWorker._nextId;
      MockWorker._instances.push(this);
    }
  }

  return { Worker: MockWorker };
});

// Import AFTER mock registration so the service picks up MockWorker.
import { Worker } from "node:worker_threads";
import { SlotsWorkerService_2024_04_15 } from "./slots-worker.service";

// Typed handle to the mock class so we can reset static state between tests.
const MockWorkerCtor = Worker as unknown as {
  new (_path: string): MockWorkerInstance;
  _nextId: number;
  _instances: MockWorkerInstance[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides: Record<string, unknown> = {}): ConfigService {
  const values: Record<string, unknown> = {
    slotsWorkerPoolSize: 2,
    enableSlotsWorkers: true,
    e2e: false,
    ...overrides,
  };
  return {
    get: jest.fn().mockImplementation((key: string) => values[key] ?? null),
  } as unknown as ConfigService;
}

function internals(svc: SlotsWorkerService_2024_04_15): ServiceInternals {
  return svc as unknown as ServiceInternals;
}

/** Access the private workerPool array on the service. */
function workerPool(svc: SlotsWorkerService_2024_04_15): MockWorkerInstance[] {
  return internals(svc).workerPool;
}

/** Access the private availableWorkers array on the service. */
function availableWorkers(svc: SlotsWorkerService_2024_04_15): MockWorkerInstance[] {
  return internals(svc).availableWorkers;
}

/**
 * Returns the worker currently processing a task —
 * i.e. in workerPool but not yet back in availableWorkers.
 */
function getBusyWorker(svc: SlotsWorkerService_2024_04_15): MockWorkerInstance {
  const pool = workerPool(svc);
  const avail = availableWorkers(svc);
  const busy = pool.find((w) => !avail.includes(w));
  if (!busy) throw new Error("No busy worker found — task was not dispatched");
  return busy;
}

// ---------------------------------------------------------------------------

describe("SlotsWorkerService_2024_04_15 — double error handler", () => {
  beforeEach(() => {
    // Reset mock worker tracking between tests.
    MockWorkerCtor._instances = [];
    MockWorkerCtor._nextId = 0;
    jest.clearAllMocks();

    // Silence NestJS logger output during tests.
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // These tests assert the CORRECT behaviour.
  // With the fix applied  → all PASS.
  // With the bug (stashed) → the first three FAIL, exposing the corruption.
  // ─────────────────────────────────────────────────────────────────────────

  it("dead worker is NOT re-added to availableWorkers after crash", () => {
    const svc = new SlotsWorkerService_2024_04_15(makeConfig());

    // Dispatch a task — moves one worker out of availableWorkers.
    svc.getAvailableSlotsInWorker({} as unknown as GetScheduleOptions).catch(() => {});

    const crashedWorker = getBusyWorker(svc);

    // Trigger the error — both lifecycle on("error") and task once("error") fire.
    crashedWorker.emit("error", new Error("crash"));

    // No terminated worker should appear in availableWorkers.
    const deadInAvail = availableWorkers(svc).some((w) => w.terminated);
    expect(deadInAvail).toBe(false);
  });

  it("availableWorkers and workerPool stay in sync after crash", () => {
    const svc = new SlotsWorkerService_2024_04_15(makeConfig());

    svc.getAvailableSlotsInWorker({} as unknown as GetScheduleOptions).catch(() => {});

    const crashedWorker = getBusyWorker(svc);
    crashedWorker.emit("error", new Error("crash"));

    // Both arrays must have the same length; before fix avail=3, pool=2.
    expect(availableWorkers(svc).length).toBe(workerPool(svc).length);
  });

  it("no stale task errorListener remains on worker after a successful message", () => {
    const svc = new SlotsWorkerService_2024_04_15(makeConfig());

    svc.getAvailableSlotsInWorker({} as unknown as GetScheduleOptions).catch(() => {});

    const busyWorker = getBusyWorker(svc);

    // Simulate a successful task response.
    busyWorker.emit("message", { success: true, data: {} });

    // Only the persistent lifecycle on("error") should remain — count must be 1.
    // Before fix: messageListener did not remove errorListener, so count is 2.
    expect(busyWorker.listenerCount("error")).toBe(1);
  });

  it("no stale task messageListener remains on worker after a crash", () => {
    const svc = new SlotsWorkerService_2024_04_15(makeConfig());

    svc.getAvailableSlotsInWorker({} as unknown as GetScheduleOptions).catch(() => {});

    const crashedWorker = getBusyWorker(svc);
    crashedWorker.emit("error", new Error("crash"));

    // The sibling messageListener must have been cleaned up by errorListener.
    expect(crashedWorker.listenerCount("message")).toBe(0);
  });

  it("replacement worker is healthy and ready to accept the next task after crash", () => {
    const svc = new SlotsWorkerService_2024_04_15(makeConfig());

    svc.getAvailableSlotsInWorker({} as unknown as GetScheduleOptions).catch(() => {});

    const crashedWorker = getBusyWorker(svc);
    crashedWorker.emit("error", new Error("crash"));

    // Every worker in availableWorkers must be alive (not terminated).
    const allAlive = availableWorkers(svc).every((w) => !w.terminated);
    expect(allAlive).toBe(true);
  });
});
