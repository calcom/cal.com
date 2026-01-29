import type { RoutingStep } from "../repositories/RoutingTraceRepository.interface";

export class RoutingFormTracePresenter {
  static present(step: RoutingStep): string {
    const d = step.data;
    switch (step.step) {
      case "route_matched":
        return `Route matched: "${d.routeName}" (ID: ${d.routeId})`;
      case "fallback_route_used":
        return `Fallback route used: "${d.routeName}" (ID: ${d.routeId})`;
      case "attribute-logic-evaluated": {
        const parts: string[] = [];
        if (d.routeName) parts.push(`Route: "${d.routeName}"`);
        if (d.routeIsFallback) parts.push("(fallback)");
        if (d.attributeRoutingDetails && Array.isArray(d.attributeRoutingDetails)) {
          const details = (d.attributeRoutingDetails as Array<{ attributeName: string; attributeValue: string }>)
            .map((a) => `${a.attributeName}=${a.attributeValue}`)
            .join(", ");
          parts.push(`Attributes: [${details}]`);
        }
        return `Attribute logic evaluated: ${parts.join(" ")}`;
      }
      case "attribute_fallback_used":
        return `Attribute fallback used${d.routeName ? `: "${d.routeName}"` : ""}`;
      default:
        return `Routing Form: ${step.step}`;
    }
  }
}
