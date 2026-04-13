import { describe, expect, it } from "vitest";

import type { RoutingTrace } from "../repositories/RoutingTraceRepository.interface";
import { RoutingTracePresenter } from "./RoutingTracePresenter";

describe("RoutingTracePresenter", () => {
  describe("present", () => {
    it("delegates salesforce steps to SalesforceRoutingTracePresenter with round", () => {
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
        message: 'Searching accounts by website matching "acme.com"',
        round: "Exact Match",
        domain: "salesforce",
        step: "searching_by_website_value",
        timestamp: 1000,
      });
    });

    it("delegates routing form steps to RoutingFormTracePresenter with round", () => {
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
        round: "Routing Form",
        domain: "routing_form",
        step: "route_matched",
        timestamp: 2000,
      });
    });

    it("handles unknown domains with fallback", () => {
      const trace: RoutingTrace = [
        { domain: "unknown_domain", step: "some_step", timestamp: 3000, data: {} },
      ];

      const result = RoutingTracePresenter.present(trace);

      expect(result).toHaveLength(1);
      expect(result[0].message).toBe("unknown_domain: some_step");
      expect(result[0].round).toBe("unknown_domain");
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
      expect(result[1].message).toBe("GraphQL resolution for user@acme.com (domain: acme.com)");
      expect(result[2].message).toBe("Assigned owner@acme.com via Contact (ID: 003ABC)");
    });

    it("returns empty array for empty trace", () => {
      const result = RoutingTracePresenter.present([]);
      expect(result).toEqual([]);
    });
  });

  describe("groupByRound", () => {
    it("groups consecutive steps with the same round and domain", () => {
      const steps = RoutingTracePresenter.present([
        { domain: "salesforce", step: "searching_by_website_value", timestamp: 1000, data: { emailDomain: "acme.com" } },
        { domain: "salesforce", step: "searching_by_contact_email_domain", timestamp: 1001, data: { emailDomain: "acme.com", contactCount: 0 } },
        { domain: "salesforce", step: "fuzzy_match_initiated", timestamp: 1002, data: { email: "u@acme.in", baseDomain: "acme", isFreeEmail: false } },
        { domain: "salesforce", step: "fuzzy_match_soql_results", timestamp: 1003, data: { baseDomain: "acme", rawCount: 5, baseDomainMatchCount: 3, afterExclusionCount: 2 } },
        { domain: "salesforce", step: "host_filter_summary", timestamp: 1004, data: { totalCandidates: 2, eligibleCount: 1, droppedCount: 1, eligibleOwners: ["o@e.com"], droppedOwners: { "x@e.com": 1 } } },
        { domain: "salesforce", step: "tiebreaker_started", timestamp: 1005, data: { candidateCount: 2, candidateIds: ["001A", "001B"] } },
        { domain: "salesforce", step: "tiebreaker_winner", timestamp: 1006, data: { accountId: "001A", accountName: "Acme", decisiveRule: "P6" } },
        { domain: "salesforce", step: "routing_final_selection", timestamp: 1007, data: { accountId: "001A", ownerEmail: "o@e.com", matchMethod: "fuzzy", decisiveRule: "P6" } },
      ]);

      const groups = RoutingTracePresenter.groupByRound(steps);

      expect(groups).toHaveLength(5);
      expect(groups[0].round).toBe("Exact Match");
      expect(groups[0].steps).toHaveLength(2);
      expect(groups[1].round).toBe("Fuzzy Match");
      expect(groups[1].steps).toHaveLength(2);
      expect(groups[2].round).toBe("Host Filter");
      expect(groups[2].steps).toHaveLength(1);
      expect(groups[3].round).toBe("Tiebreaker");
      expect(groups[3].steps).toHaveLength(2);
      expect(groups[4].round).toBe("Decision");
      expect(groups[4].steps).toHaveLength(1);
    });

    it("separates groups when domain changes even if round name matches", () => {
      const steps = RoutingTracePresenter.present([
        { domain: "routing_form", step: "route_matched", timestamp: 1000, data: { routeId: "r1", routeName: "Sales" } },
        { domain: "salesforce", step: "fuzzy_match_initiated", timestamp: 1001, data: { email: "u@a.in", baseDomain: "a", isFreeEmail: false } },
      ]);

      const groups = RoutingTracePresenter.groupByRound(steps);

      expect(groups).toHaveLength(2);
      expect(groups[0].round).toBe("Routing Form");
      expect(groups[0].domain).toBe("routing_form");
      expect(groups[1].round).toBe("Fuzzy Match");
      expect(groups[1].domain).toBe("salesforce");
    });

    it("returns empty array for empty input", () => {
      expect(RoutingTracePresenter.groupByRound([])).toEqual([]);
    });
  });
});
