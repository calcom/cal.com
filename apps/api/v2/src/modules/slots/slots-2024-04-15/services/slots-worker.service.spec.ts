import { EventEmitter } from "node:events";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { GetScheduleOptions } from "@calcom/platform-libraries/slots";

interface MockWorkerInstance extends EventEmitter {
  threadId: number;
  terminated: boolean;
  postMessage: jest.Mock;
  terminate: jest.Mock;
}

interface ServiceInternals {
  workerPool: MockWorkerInstance[];
  availableWorkers: MockWorkerInstance[];
}

// jest.mock() is hoisted above imports, so the factory must use require().
jest.mock("node:worker_threads", () => {
  const { EventEmitter: EE } = require("node:events");

  class MockWorker extends EE {
    static _nextId = 0;
    static _instances: MockWorker[] = [];

    threadId: number;
    terminated = false;

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

import { Worker } from "node:worker_threads";
import { SlotsWorkerService_2024_04_15 } from "./slots-worker.service";

// jest.mock replaces Worker with MockWorker; cast needed to access mock statics _nextId/_instances.
const MockWorkerCtor = Worker as unknown as {
  new (_path: string): MockWorkerInstance;
  _nextId: number;
  _instances: MockWorkerInstance[];
};

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
  const internal = svc as unknown as Record<string, unknown>;
  if (!Array.isArray(internal.workerPool) || !Array.isArray(internal.availableWorkers)) {
    throw new Error(
      "Expected SlotsWorkerService private fields workerPool and availableWorkers to exist"
    );
  }
  return internal as unknown as ServiceInternals;
}

function workerPool(svc: SlotsWorkerService_2024_04_15): MockWorkerInstance[] {
  return internals(svc).workerPool;
}

function availableWorkers(svc: SlotsWorkerService_2024_04_15): MockWorkerInstance[] {
  return internals(svc).availableWorkers;
}

/** Returns the worker currently processing a task (in pool but not in availableWorkers). */
function getBusyWorker(svc: SlotsWorkerService_2024_04_15): MockWorkerInstance {
  const pool = workerPool(svc);
  const avail = availableWorkers(svc);
  const busy = pool.find((w) => !avail.includes(w));
  if (!busy) throw new Error("No busy worker found — task was not dispatched");
  return busy;
}

describe("SlotsWorkerService_2024_04_15 — double error handler", () => {
  beforeEach(() => {
    MockWorkerCtor._instances = [];
    MockWorkerCtor._nextId = 0;
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);
  });

  it("dead worker is NOT re-added to availableWorkers after crash", () => {
    const svc = new SlotsWorkerService_2024_04_15(makeConfig());
    svc.getAvailableSlotsInWorker({} as unknown as GetScheduleOptions).catch(() => {});

    const crashedWorker = getBusyWorker(svc);
    crashedWorker.emit("error", new Error("crash"));

    const deadInAvail = availableWorkers(svc).some((w) => w.terminated);
    expect(deadInAvail).toBe(false);
  });

  it("availableWorkers and workerPool stay in sync after crash", () => {
    const svc = new SlotsWorkerService_2024_04_15(makeConfig());
    svc.getAvailableSlotsInWorker({} as unknown as GetScheduleOptions).catch(() => {});

    const crashedWorker = getBusyWorker(svc);
    crashedWorker.emit("error", new Error("crash"));

    expect(availableWorkers(svc).length).toBe(workerPool(svc).length);
  });

  it("no stale task errorListener remains on worker after a successful message", () => {
    const svc = new SlotsWorkerService_2024_04_15(makeConfig());
    svc.getAvailableSlotsInWorker({} as unknown as GetScheduleOptions).catch(() => {});

    const busyWorker = getBusyWorker(svc);
    busyWorker.emit("message", { success: true, data: {} });

    expect(busyWorker.listenerCount("error")).toBe(1);
  });

  it("no stale task messageListener remains on worker after a crash", () => {
    const svc = new SlotsWorkerService_2024_04_15(makeConfig());
    svc.getAvailableSlotsInWorker({} as unknown as GetScheduleOptions).catch(() => {});

    const crashedWorker = getBusyWorker(svc);
    crashedWorker.emit("error", new Error("crash"));

    expect(crashedWorker.listenerCount("message")).toBe(0);
  });

  it("replacement worker is healthy and ready to accept the next task after crash", () => {
    const svc = new SlotsWorkerService_2024_04_15(makeConfig());
    svc.getAvailableSlotsInWorker({} as unknown as GetScheduleOptions).catch(() => {});

    const crashedWorker = getBusyWorker(svc);
    crashedWorker.emit("error", new Error("crash"));

    const allAlive = availableWorkers(svc).every((w) => !w.terminated);
    expect(allAlive).toBe(true);
  });
});
