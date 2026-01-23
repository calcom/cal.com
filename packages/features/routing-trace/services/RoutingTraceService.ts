import { AsyncLocalStorage } from "async_hooks";

import type { IPendingRoutingTraceRepository } from "../repositories/PendingRoutingTraceRepository.interface";
import type { RoutingStep } from "../repositories/RoutingTraceRepository.interface";

interface IRoutingTraceServiceDeps {
  pendingRoutingTraceRepository: IPendingRoutingTraceRepository;
}

export class RoutingTraceService {
  private static storage = new AsyncLocalStorage<RoutingTraceService>();

  private routingTraceSteps: RoutingStep[] = [];

  constructor(private readonly deps: IRoutingTraceServiceDeps) {}

  /** Entry point — wrap your routing logic with this */
  static ensure<T>(deps: IRoutingTraceServiceDeps, fn: () => T): T {
    const existing = this.storage.getStore();
    if (existing) {
      return fn();
    }
    return this.storage.run(new RoutingTraceService(deps), fn);
  }

  /** Get current instance (throws if outside context) */
  static current(): RoutingTraceService {
    const store = this.storage.getStore();
    if (!store) {
      throw new Error("RoutingTraceService.ensure() must be called first");
    }
    return store;
  }

  /** To be called by the domain specific routing trace services */
  addStep({
    domain,
    step,
    data,
  }: {
    domain: string;
    step: string;
    data?: Record<string, unknown>;
  }) {
    this.routingTraceSteps.push({ domain, step, timestamp: Date.now(), data });
  }

  /** Save pending trace when routing form is submitted (before booking is created) */
  async savePendingRoutingTrace(
    args: { formResponseId: number } | { queuedFormResponseId: string }
  ) {
    await this.deps.pendingRoutingTraceRepository.create({
      trace: this.routingTraceSteps,
      ...args,
    });
  }
}
