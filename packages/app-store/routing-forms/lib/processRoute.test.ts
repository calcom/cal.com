import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RoutingFormTraceService } from "@calcom/features/routing-trace/domains/RoutingFormTraceService";
import { RaqbLogicResult } from "@calcom/lib/raqb/evaluateRaqbLogic";

import type { FormResponse, SerializableForm } from "../types/types";
import { findMatchingRoute } from "./processRoute";

vi.mock("@calcom/lib/raqb/evaluateRaqbLogic", () => ({
  evaluateRaqbLogic: vi.fn(),
  RaqbLogicResult: {
    MATCH: "MATCH",
    NO_MATCH: "NO_MATCH",
    LOGIC_NOT_FOUND_SO_MATCHED: "LOGIC_NOT_FOUND_SO_MATCHED",
  },
}));

vi.mock("./getQueryBuilderConfig", () => ({
  getQueryBuilderConfigForFormFields: vi.fn().mockReturnValue({}),
}));

const { evaluateRaqbLogic } = await import("@calcom/lib/raqb/evaluateRaqbLogic");

describe("findMatchingRoute", () => {
  let mockRoutingFormTrace: RoutingFormTraceService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRoutingFormTrace = {
      routeMatched: vi.fn(),
      fallbackRouteUsed: vi.fn(),
      attributeLogicEvaluated: vi.fn(),
      attributeFallbackUsed: vi.fn(),
    } as unknown as RoutingFormTraceService;
  });

  const createMockForm = (
    routes: Array<{
      id: string;
      name?: string;
      isFallback?: boolean;
      queryValue?: unknown;
    }>
  ): Pick<SerializableForm<never>, "routes" | "fields"> => ({
    routes: routes.map((route) => ({
      id: route.id,
      name: route.name,
      isFallback: route.isFallback ?? false,
      queryValue: route.queryValue ?? { type: "group" },
      action: { type: "customPageMessage", value: "test" },
    })) as never,
    fields: [],
  });

  const createMockResponse = (): Record<string, Pick<FormResponse[string], "value">> => ({});

  it("should throw error if fallback route is missing", () => {
    const form = createMockForm([{ id: "route-1", name: "Route 1" }]);

    expect(() =>
      findMatchingRoute({
        form,
        response: createMockResponse(),
      })
    ).toThrow("Fallback route is missing");
  });

  it("should return null if no route matches", () => {
    vi.mocked(evaluateRaqbLogic).mockReturnValue(RaqbLogicResult.NO_MATCH);

    const form = createMockForm([
      { id: "route-1", name: "Route 1" },
      { id: "fallback", name: "Fallback", isFallback: true },
    ]);

    const result = findMatchingRoute({
      form,
      response: createMockResponse(),
    });

    expect(result).toBeNull();
  });

  describe("tracing", () => {
    it("should call routeMatched when a non-fallback route matches", () => {
      vi.mocked(evaluateRaqbLogic).mockReturnValue(RaqbLogicResult.MATCH);

      const form = createMockForm([
        { id: "route-1", name: "Sales Route" },
        { id: "fallback", name: "Default", isFallback: true },
      ]);

      const result = findMatchingRoute({
        form,
        response: createMockResponse(),
        routingFormTraceService: mockRoutingFormTrace,
      });

      expect(result).not.toBeNull();
      expect(mockRoutingFormTrace.routeMatched).toHaveBeenCalledWith({
        routeId: "route-1",
        routeName: "Sales Route",
      });
      expect(mockRoutingFormTrace.fallbackRouteUsed).not.toHaveBeenCalled();
    });

    it("should call fallbackRouteUsed when fallback route is used", () => {
      vi.mocked(evaluateRaqbLogic)
        .mockReturnValueOnce(RaqbLogicResult.NO_MATCH)
        .mockReturnValueOnce(RaqbLogicResult.MATCH);

      const form = createMockForm([
        { id: "route-1", name: "Sales Route" },
        { id: "fallback", name: "Default Route", isFallback: true },
      ]);

      const result = findMatchingRoute({
        form,
        response: createMockResponse(),
        routingFormTraceService: mockRoutingFormTrace,
      });

      expect(result).not.toBeNull();
      expect(mockRoutingFormTrace.fallbackRouteUsed).toHaveBeenCalledWith({
        routeId: "fallback",
        routeName: "Default Route",
      });
      expect(mockRoutingFormTrace.routeMatched).not.toHaveBeenCalled();
    });

    it("should use 'default_route' as name when fallback route has no name", () => {
      vi.mocked(evaluateRaqbLogic)
        .mockReturnValueOnce(RaqbLogicResult.NO_MATCH)
        .mockReturnValueOnce(RaqbLogicResult.MATCH);

      const form = createMockForm([
        { id: "route-1", name: "Sales Route" },
        { id: "fallback", isFallback: true },
      ]);

      const result = findMatchingRoute({
        form,
        response: createMockResponse(),
        routingFormTraceService: mockRoutingFormTrace,
      });

      expect(result).not.toBeNull();
      expect(mockRoutingFormTrace.fallbackRouteUsed).toHaveBeenCalledWith({
        routeId: "fallback",
        routeName: "default_route",
      });
    });

    it("should use route id as name when route has no name", () => {
      vi.mocked(evaluateRaqbLogic).mockReturnValue(RaqbLogicResult.MATCH);

      const form = createMockForm([{ id: "route-123" }, { id: "fallback", isFallback: true }]);

      const result = findMatchingRoute({
        form,
        response: createMockResponse(),
        routingFormTraceService: mockRoutingFormTrace,
      });

      expect(result).not.toBeNull();
      expect(mockRoutingFormTrace.routeMatched).toHaveBeenCalledWith({
        routeId: "route-123",
        routeName: "route-123",
      });
    });

    it("should not call trace methods when routingFormTrace is not provided", () => {
      vi.mocked(evaluateRaqbLogic).mockReturnValue(RaqbLogicResult.MATCH);

      const form = createMockForm([
        { id: "route-1", name: "Sales Route" },
        { id: "fallback", isFallback: true },
      ]);

      const result = findMatchingRoute({
        form,
        response: createMockResponse(),
      });

      expect(result).not.toBeNull();
      expect(mockRoutingFormTrace.routeMatched).not.toHaveBeenCalled();
      expect(mockRoutingFormTrace.fallbackRouteUsed).not.toHaveBeenCalled();
    });

    it("should handle LOGIC_NOT_FOUND_SO_MATCHED as a match", () => {
      vi.mocked(evaluateRaqbLogic).mockReturnValue(RaqbLogicResult.LOGIC_NOT_FOUND_SO_MATCHED);

      const form = createMockForm([
        { id: "route-1", name: "Auto Match Route" },
        { id: "fallback", isFallback: true },
      ]);

      const result = findMatchingRoute({
        form,
        response: createMockResponse(),
        routingFormTraceService: mockRoutingFormTrace,
      });

      expect(result).not.toBeNull();
      expect(mockRoutingFormTrace.routeMatched).toHaveBeenCalledWith({
        routeId: "route-1",
        routeName: "Auto Match Route",
      });
    });
  });
});
