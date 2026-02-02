import { ROUTING_TRACE_DOMAINS } from "../constants";
import type { RoutingTraceService } from "../services/RoutingTraceService";

export const ROUTING_FORM_STEPS = {
  ROUTE_MATCHED: "route_matched",
  FALLBACK_ROUTE_USED: "fallback_route_used",
  ATTRIBUTE_LOGIC_EVALUATED: "attribute-logic-evaluated",
  ATTRIBUTE_FALLBACK_USED: "attribute_fallback_used",
} as const;

export class RoutingFormTraceService {
  constructor(private readonly traceService: RoutingTraceService) {}

  routeMatched(data: { routeId: string; routeName: string }): void {
    this.traceService.addStep({
      domain: ROUTING_TRACE_DOMAINS.ROUTING_FORM,
      step: ROUTING_FORM_STEPS.ROUTE_MATCHED,
      data,
    });
  }

  fallbackRouteUsed(data: { routeId: string; routeName: string }): void {
    this.traceService.addStep({
      domain: ROUTING_TRACE_DOMAINS.ROUTING_FORM,
      step: ROUTING_FORM_STEPS.FALLBACK_ROUTE_USED,
      data,
    });
  }

  attributeLogicEvaluated(data: {
    routeName?: string;
    routeIsFallback?: boolean;
    checkedFallback?: boolean;
    attributeRoutingDetails?: Array<{ attributeName: string; attributeValue: string }>;
  }): void {
    this.traceService.addStep({
      domain: ROUTING_TRACE_DOMAINS.ROUTING_FORM,
      step: ROUTING_FORM_STEPS.ATTRIBUTE_LOGIC_EVALUATED,
      data,
    });
  }

  attributeFallbackUsed(data: { routeName?: string }): void {
    this.traceService.addStep({
      domain: ROUTING_TRACE_DOMAINS.ROUTING_FORM,
      step: ROUTING_FORM_STEPS.ATTRIBUTE_FALLBACK_USED,
      data,
    });
  }
}
