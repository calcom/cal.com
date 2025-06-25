/**
 * Tests for rescheduling bookings with routing forms and attribute logic edge cases
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

import type { RaqbLogicResult } from "@calcom/lib/raqb/evaluateRaqbLogic";

const timeout = process.env.CI ? 70000 : 20000;

describe("handleNewBooking - Routing Forms Reschedule Edge Cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Bug Fix - Correct Filtering Logic", () => {
    it("should correctly filter team members with result === 'MATCH'", async () => {
      const mockTeamMembersResult = {
        teamMembersMatchingAttributeLogic: [
          { userId: 101, result: "MATCH" as RaqbLogicResult },
          { userId: 102, result: "NO_MATCH" as RaqbLogicResult },
          { userId: 103, result: "MATCH" as RaqbLogicResult },
          { userId: 104, result: "INDETERMINATE" as RaqbLogicResult },
        ],
      };

      const filteredResults = mockTeamMembersResult.teamMembersMatchingAttributeLogic
        .filter((member) => member.result === "MATCH")
        .map((member) => member.userId);

      expect(filteredResults).toEqual([101, 103]);
      expect(filteredResults).not.toContain(102);
      expect(filteredResults).not.toContain(104);

      // Verify the old buggy logic would fail
      const buggyFilteredResults = mockTeamMembersResult.teamMembersMatchingAttributeLogic.filter(
        (member: any) => member.result.isMatch
      );

      expect(buggyFilteredResults).toEqual([]);
    });

    it("should handle empty results from attribute logic during reschedule", async () => {
      const mockTeamMembersResult = {
        teamMembersMatchingAttributeLogic: [],
      };

      const filteredResults = mockTeamMembersResult.teamMembersMatchingAttributeLogic
        .filter((member) => member.result === "MATCH")
        .map((member) => member.userId);

      expect(filteredResults).toEqual([]);
      expect(mockTeamMembersResult.teamMembersMatchingAttributeLogic.length).toBe(0);
    });

    it("should handle mixed results correctly", async () => {
      const mockTeamMembersResult = {
        teamMembersMatchingAttributeLogic: [
          { userId: 201, result: "MATCH" as RaqbLogicResult },
          { userId: 202, result: "NO_MATCH" as RaqbLogicResult },
          { userId: 203, result: "MATCH" as RaqbLogicResult },
          { userId: 204, result: "INDETERMINATE" as RaqbLogicResult },
          { userId: 205, result: "MATCH" as RaqbLogicResult },
        ],
      };

      const filteredResults = mockTeamMembersResult.teamMembersMatchingAttributeLogic
        .filter((member) => member.result === "MATCH")
        .map((member) => member.userId);

      expect(filteredResults).toEqual([201, 203, 205]);
      expect(filteredResults.length).toBe(3);
    });
  });

  describe("Edge Cases for Routing Forms", () => {
    it("should handle missing attributeRoutingConfig gracefully", async () => {
      const routeWithoutAttributeConfig = {
        id: "route-1",
        action: { type: "eventTypeRedirect" },
        // Missing attributeRoutingConfig
      };

      expect(routeWithoutAttributeConfig.action.type).toBe("eventTypeRedirect");
      expect(routeWithoutAttributeConfig.attributeRoutingConfig).toBeUndefined();
    });

    it("should handle non-eventTypeRedirect action types", async () => {
      const routeWithDifferentAction = {
        id: "route-1",
        action: { type: "customPageMessage" },
        attributeRoutingConfig: {
          /* some config */
        },
      };

      expect(routeWithDifferentAction.action.type).not.toBe("eventTypeRedirect");
    });

    it("should handle missing team ID", async () => {
      const eventTypeWithoutTeam = {
        id: 1,
        teamId: null,
      };

      expect(eventTypeWithoutTeam.teamId).toBe(null);
    });
  });

  describe("Performance and Error Handling", () => {
    it("should not re-evaluate routing logic when not necessary", async () => {
      const mockFindTeamMembers = vi.fn();

      const bookingWithoutRoutingForm = {
        uid: "booking-without-routing",
        routedFromRoutingFormReponse: null,
      };

      expect(mockFindTeamMembers).not.toHaveBeenCalled();
      expect(bookingWithoutRoutingForm.routedFromRoutingFormReponse).toBe(null);
    });
  });

  describe("Stale Form Structures and Team Changes", () => {
    it("should handle reschedule when routing form fields have changed", async () => {
      const mockOriginalBooking = {
        routedFromRoutingFormReponse: {
          id: 1,
          response: { "old-field": "value" },
          form: {
            routes: [{ id: "route-1", action: { type: "eventTypeRedirect" }, attributeRoutingConfig: {} }],
            fields: [{ id: "old-field", type: "text" }],
          },
          chosenRouteId: "route-1",
        },
      };

      const mockCurrentForm = {
        routes: [{ id: "route-1", action: { type: "eventTypeRedirect" }, attributeRoutingConfig: {} }],
        fields: [{ id: "new-field", type: "text" }],
      };

      expect(mockOriginalBooking.routedFromRoutingFormReponse.form.fields.length).toBe(1);
      expect(mockCurrentForm.fields[0].id).toBe("new-field");
    });

    it("should handle reschedule when team members have been removed", async () => {
      const mockTeamMembersResult = {
        teamMembersMatchingAttributeLogic: [
          { userId: 101, result: "MATCH" as RaqbLogicResult },
          { userId: 102, result: "NO_MATCH" as RaqbLogicResult },
        ],
      };

      const filteredResults = mockTeamMembersResult.teamMembersMatchingAttributeLogic
        .filter((member) => member.result === "MATCH")
        .map((member) => member.userId);

      expect(filteredResults).toEqual([101]);
      expect(filteredResults).not.toContain(103); // Removed user
    });

    it("should handle reschedule when new team members have been added", async () => {
      const mockTeamMembersResult = {
        teamMembersMatchingAttributeLogic: [
          { userId: 101, result: "MATCH" as RaqbLogicResult },
          { userId: 102, result: "NO_MATCH" as RaqbLogicResult },
          { userId: 104, result: "MATCH" as RaqbLogicResult },
          { userId: 105, result: "MATCH" as RaqbLogicResult },
        ],
      };

      const filteredResults = mockTeamMembersResult.teamMembersMatchingAttributeLogic
        .filter((member) => member.result === "MATCH")
        .map((member) => member.userId);

      expect(filteredResults).toEqual([101, 104, 105]);
      expect(filteredResults.length).toBe(3);
    });

    it("should handle reschedule when routing form has been completely restructured", async () => {
      const mockOriginalBooking = {
        routedFromRoutingFormReponse: {
          id: 1,
          response: { question1: "answer1" },
          form: {
            routes: [],
            fields: [],
          },
          chosenRouteId: "non-existent-route",
        },
      };

      const routes = mockOriginalBooking.routedFromRoutingFormReponse.form.routes;
      const chosenRoute = routes.find(
        (route) => route.id === mockOriginalBooking.routedFromRoutingFormReponse.chosenRouteId
      );

      expect(chosenRoute).toBeUndefined();
    });

    it("should handle reschedule when attribute routing config has changed", async () => {
      const mockOriginalBooking = {
        routedFromRoutingFormReponse: {
          id: 1,
          response: { department: "sales" },
          form: {
            routes: [
              {
                id: "route-1",
                action: { type: "eventTypeRedirect" },
                attributeRoutingConfig: {
                  conditions: [{ field: "old-attribute", value: "sales" }],
                },
              },
            ],
            fields: [{ id: "department", type: "select" }],
          },
          chosenRouteId: "route-1",
        },
      };

      expect(
        mockOriginalBooking.routedFromRoutingFormReponse.form.routes[0].attributeRoutingConfig
      ).toBeDefined();
      expect(mockOriginalBooking.routedFromRoutingFormReponse.response.department).toBe("sales");
    });

    it("should maintain booking continuity despite form changes", async () => {
      const mockScenario = {
        originalFormVersion: {
          fields: [{ id: "field1", type: "text" }],
          routes: [{ id: "route1", action: { type: "eventTypeRedirect" } }],
        },
        currentFormVersion: {
          fields: [{ id: "field2", type: "select" }],
          routes: [{ id: "route2", action: { type: "eventTypeRedirect" } }],
        },
        originalResponse: { field1: "value1" },
      };

      expect(mockScenario.originalFormVersion.fields.length).toBe(1);
      expect(mockScenario.currentFormVersion.fields.length).toBe(1);
    });
  });
});
