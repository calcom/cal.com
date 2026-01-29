import { describe, expect, it } from "vitest";

import type { RoutingStep } from "../repositories/RoutingTraceRepository.interface";
import { RoutingFormTracePresenter } from "./RoutingFormTracePresenter";

function makeStep(step: string, data: Record<string, unknown> = {}): RoutingStep {
  return { domain: "routing_form", step, timestamp: Date.now(), data };
}

describe("RoutingFormTracePresenter", () => {
  it("presents route_matched", () => {
    const result = RoutingFormTracePresenter.present(
      makeStep("route_matched", { routeId: "route-1", routeName: "Enterprise" })
    );
    expect(result).toBe('Route matched: "Enterprise" (ID: route-1)');
  });

  it("presents fallback_route_used", () => {
    const result = RoutingFormTracePresenter.present(
      makeStep("fallback_route_used", { routeId: "route-2", routeName: "Default" })
    );
    expect(result).toBe('Fallback route used: "Default" (ID: route-2)');
  });

  it("presents attribute-logic-evaluated with all fields", () => {
    const result = RoutingFormTracePresenter.present(
      makeStep("attribute-logic-evaluated", {
        routeName: "APAC",
        routeIsFallback: false,
        attributeRoutingDetails: [
          { attributeName: "Company Size", attributeValue: "Enterprise" },
          { attributeName: "Region", attributeValue: "APAC" },
        ],
      })
    );
    expect(result).toBe(
      'Attribute logic evaluated: Route: "APAC" Attributes: [Company Size=Enterprise, Region=APAC]'
    );
  });

  it("presents attribute-logic-evaluated with fallback", () => {
    const result = RoutingFormTracePresenter.present(
      makeStep("attribute-logic-evaluated", {
        routeName: "Fallback Route",
        routeIsFallback: true,
      })
    );
    expect(result).toBe('Attribute logic evaluated: Route: "Fallback Route" (fallback)');
  });

  it("presents attribute-logic-evaluated with no optional fields", () => {
    const result = RoutingFormTracePresenter.present(makeStep("attribute-logic-evaluated", {}));
    expect(result).toBe("Attribute logic evaluated: ");
  });

  it("presents attribute_fallback_used with routeName", () => {
    const result = RoutingFormTracePresenter.present(
      makeStep("attribute_fallback_used", { routeName: "Default Route" })
    );
    expect(result).toBe('Attribute fallback used: "Default Route"');
  });

  it("presents attribute_fallback_used without routeName", () => {
    const result = RoutingFormTracePresenter.present(makeStep("attribute_fallback_used", {}));
    expect(result).toBe("Attribute fallback used");
  });

  it("returns fallback for unknown step", () => {
    const result = RoutingFormTracePresenter.present(makeStep("unknown_step", {}));
    expect(result).toBe("Routing Form: unknown_step");
  });
});
