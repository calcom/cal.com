import { describe, expect, it } from "vitest";

import type { RoutingTrace } from "../repositories/RoutingTraceRepository.interface";
import { RoutingTracePresenter } from "./RoutingTracePresenter";

describe("RoutingTracePresenter", () => {
  it("delegates salesforce steps to SalesforceRoutingTracePresenter", () => {
    const trace: RoutingTrace = [
      {
        domain: "salesforce",
        step: "searching_by_website_value",
        timestamp: 1000,
        data: { emailDomain: "acme.com" },
      },
    ];

    const result = RoutingTracePresenter.present(trace);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      message: 'Searching for Salesforce account by website matching domain "acme.com"',
      domain: "salesforce",
      step: "searching_by_website_value",
      timestamp: 1000,
    });
  });

  it("delegates routing form steps to RoutingFormTracePresenter", () => {
    const trace: RoutingTrace = [
      {
        domain: "routing_form",
        step: "route_matched",
        timestamp: 2000,
        data: { routeId: "route-1", routeName: "Enterprise" },
      },
    ];

    const result = RoutingTracePresenter.present(trace);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      message: 'Route matched: "Enterprise" (ID: route-1)',
      domain: "routing_form",
      step: "route_matched",
      timestamp: 2000,
    });
  });

  it("handles unknown domains with fallback", () => {
    const trace: RoutingTrace = [
      {
        domain: "unknown_domain",
        step: "some_step",
        timestamp: 3000,
        data: {},
      },
    ];

    const result = RoutingTracePresenter.present(trace);

    expect(result).toHaveLength(1);
    expect(result[0].message).toBe("unknown_domain: some_step");
  });

  it("presents a multi-step trace in order", () => {
    const trace: RoutingTrace = [
      {
        domain: "routing_form",
        step: "route_matched",
        timestamp: 1000,
        data: { routeId: "route-1", routeName: "Sales" },
      },
      {
        domain: "salesforce",
        step: "graphql_query_initiated",
        timestamp: 2000,
        data: { email: "user@acme.com", emailDomain: "acme.com" },
      },
      {
        domain: "salesforce",
        step: "salesforce_assignment",
        timestamp: 3000,
        data: { email: "owner@acme.com", recordType: "Contact", recordId: "003ABC" },
      },
    ];

    const result = RoutingTracePresenter.present(trace);

    expect(result).toHaveLength(3);
    expect(result[0].message).toBe('Route matched: "Sales" (ID: route-1)');
    expect(result[1].message).toBe(
      "GraphQL account resolution initiated for user@acme.com (domain: acme.com)"
    );
    expect(result[2].message).toBe("Salesforce assignment: owner@acme.com via Contact (ID: 003ABC)");
  });

  it("returns empty array for empty trace", () => {
    const result = RoutingTracePresenter.present([]);
    expect(result).toEqual([]);
  });
});
