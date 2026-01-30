import { beforeEach, describe, expect, it, vi } from "vitest";
import { ROUTING_TRACE_DOMAINS } from "../constants";
import type { RoutingTraceService } from "../services/RoutingTraceService";
import { ROUTING_FORM_STEPS, RoutingFormTraceService } from "./RoutingFormTraceService";

describe("RoutingFormTraceService", () => {
  let mockTraceService: RoutingTraceService;
  let routingFormTraceService: RoutingFormTraceService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTraceService = {
      addStep: vi.fn(),
    } as unknown as RoutingTraceService;
    routingFormTraceService = new RoutingFormTraceService(mockTraceService);
  });

  describe("routeMatched", () => {
    it("should add a route_matched step with correct data", () => {
      routingFormTraceService.routeMatched({
        routeId: "route-123",
        routeName: "Sales Route",
      });

      expect(mockTraceService.addStep).toHaveBeenCalledWith({
        domain: ROUTING_TRACE_DOMAINS.ROUTING_FORM,
        step: ROUTING_FORM_STEPS.ROUTE_MATCHED,
        data: {
          routeId: "route-123",
          routeName: "Sales Route",
        },
      });
    });
  });

  describe("fallbackRouteUsed", () => {
    it("should add a fallback_route_used step with correct data", () => {
      routingFormTraceService.fallbackRouteUsed({
        routeId: "fallback-route",
        routeName: "Default Route",
      });

      expect(mockTraceService.addStep).toHaveBeenCalledWith({
        domain: ROUTING_TRACE_DOMAINS.ROUTING_FORM,
        step: ROUTING_FORM_STEPS.FALLBACK_ROUTE_USED,
        data: {
          routeId: "fallback-route",
          routeName: "Default Route",
        },
      });
    });
  });

  describe("attributeLogicEvaluated", () => {
    it("should add an attribute-logic-evaluated step with routing details", () => {
      routingFormTraceService.attributeLogicEvaluated({
        routeName: "Enterprise Route",
        routeIsFallback: false,
        checkedFallback: true,
        attributeRoutingDetails: [
          { attributeName: "Company Size", attributeValue: "Enterprise" },
          { attributeName: "Region", attributeValue: "APAC" },
        ],
      });

      expect(mockTraceService.addStep).toHaveBeenCalledWith({
        domain: ROUTING_TRACE_DOMAINS.ROUTING_FORM,
        step: ROUTING_FORM_STEPS.ATTRIBUTE_LOGIC_EVALUATED,
        data: {
          routeName: "Enterprise Route",
          routeIsFallback: false,
          checkedFallback: true,
          attributeRoutingDetails: [
            { attributeName: "Company Size", attributeValue: "Enterprise" },
            { attributeName: "Region", attributeValue: "APAC" },
          ],
        },
      });
    });

    it("should add an attribute-logic-evaluated step with minimal data", () => {
      routingFormTraceService.attributeLogicEvaluated({});

      expect(mockTraceService.addStep).toHaveBeenCalledWith({
        domain: ROUTING_TRACE_DOMAINS.ROUTING_FORM,
        step: ROUTING_FORM_STEPS.ATTRIBUTE_LOGIC_EVALUATED,
        data: {},
      });
    });
  });

  describe("attributeFallbackUsed", () => {
    it("should add an attribute_fallback_used step with route name", () => {
      routingFormTraceService.attributeFallbackUsed({
        routeName: "Fallback Route",
      });

      expect(mockTraceService.addStep).toHaveBeenCalledWith({
        domain: ROUTING_TRACE_DOMAINS.ROUTING_FORM,
        step: ROUTING_FORM_STEPS.ATTRIBUTE_FALLBACK_USED,
        data: {
          routeName: "Fallback Route",
        },
      });
    });

    it("should add an attribute_fallback_used step with undefined route name", () => {
      routingFormTraceService.attributeFallbackUsed({});

      expect(mockTraceService.addStep).toHaveBeenCalledWith({
        domain: ROUTING_TRACE_DOMAINS.ROUTING_FORM,
        step: ROUTING_FORM_STEPS.ATTRIBUTE_FALLBACK_USED,
        data: {},
      });
    });
  });

  describe("ROUTING_FORM_STEPS constants", () => {
    it("should have correct step values", () => {
      expect(ROUTING_FORM_STEPS.ROUTE_MATCHED).toBe("route_matched");
      expect(ROUTING_FORM_STEPS.FALLBACK_ROUTE_USED).toBe("fallback_route_used");
      expect(ROUTING_FORM_STEPS.ATTRIBUTE_LOGIC_EVALUATED).toBe("attribute-logic-evaluated");
      expect(ROUTING_FORM_STEPS.ATTRIBUTE_FALLBACK_USED).toBe("attribute_fallback_used");
    });
  });
});
