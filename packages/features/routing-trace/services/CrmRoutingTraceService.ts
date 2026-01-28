import type { RoutingTraceService } from "./RoutingTraceService";

/**
 * CRM-specific wrapper around RoutingTraceService.
 * Used to add trace steps with CRM domain prefixing.
 *
 * Note: We use explicit parameter passing instead of AsyncLocalStorage
 * because Sentry's withReporting wrapper creates its own context that
 * breaks AsyncLocalStorage when called outside the wrapper.
 */
export class CrmRoutingTraceService {
  constructor(private parentTraceService: RoutingTraceService) {}

  /**
   * Factory method to create a CrmRoutingTraceService if parent exists.
   * Returns undefined if no parent trace service is provided.
   */
  static create(parent: RoutingTraceService | undefined): CrmRoutingTraceService | undefined {
    if (!parent) return undefined;
    return new CrmRoutingTraceService(parent);
  }

  /**
   * Add a trace step to the parent service with CRM-specific domain.
   */
  addStep(domain: string, step: string, data: Record<string, unknown> = {}): void {
    this.parentTraceService.addStep({ domain, step, data });
  }
}
