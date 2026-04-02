import { AsyncLocalStorage } from "node:async_hooks";
import type { RoutingTraceService } from "./RoutingTraceService";

/**
 * CRM-specific wrapper around RoutingTraceService.
 * Uses AsyncLocalStorage to make the trace service available to CRM-specific
 * trace services (e.g., SalesforceRoutingTraceService) without explicit parameter passing.
 */
export class CrmRoutingTraceService {
  private static als = new AsyncLocalStorage<CrmRoutingTraceService>();

  constructor(private parentTraceService: RoutingTraceService) {}

  /**
   * Get the current CrmRoutingTraceService from AsyncLocalStorage.
   * Returns undefined if not within a CRM trace context.
   */
  static getCurrent(): CrmRoutingTraceService | undefined {
    return CrmRoutingTraceService.als.getStore();
  }

  /**
   * Factory method to create a CrmRoutingTraceService if parent exists.
   * Returns undefined if no parent trace service is provided.
   */
  static create(parent: RoutingTraceService | undefined): CrmRoutingTraceService | undefined {
    if (!parent) return undefined;
    return new CrmRoutingTraceService(parent);
  }

  /**
   * Run an async function within this CRM trace service's context.
   * Any code within the callback can access this trace service via getCurrent().
   */
  runAsync<T>(fn: () => Promise<T>): Promise<T> {
    return CrmRoutingTraceService.als.run(this, fn);
  }

  /**
   * Add a trace step to the parent service.
   */
  addStep(domain: string, step: string, data: Record<string, unknown> = {}): void {
    this.parentTraceService.addStep({ domain, step, data });
  }
}
