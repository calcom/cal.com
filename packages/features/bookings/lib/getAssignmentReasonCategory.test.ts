import { describe, expect, it } from "vitest";

import { AssignmentReasonEnum } from "@calcom/prisma/enums";

import { getAssignmentReasonCategory } from "./getAssignmentReasonCategory";

describe("getAssignmentReasonCategory", () => {
  it("returns 'routed' for ROUTING_FORM_ROUTING", () => {
    expect(getAssignmentReasonCategory(AssignmentReasonEnum.ROUTING_FORM_ROUTING)).toBe("routed");
  });

  it("returns 'routed' for ROUTING_FORM_ROUTING_FALLBACK", () => {
    expect(getAssignmentReasonCategory(AssignmentReasonEnum.ROUTING_FORM_ROUTING_FALLBACK)).toBe("routed");
  });

  it("returns 'reassigned' for REASSIGNED", () => {
    expect(getAssignmentReasonCategory(AssignmentReasonEnum.REASSIGNED)).toBe("reassigned");
  });

  it("returns 'reassigned' for RR_REASSIGNED", () => {
    expect(getAssignmentReasonCategory(AssignmentReasonEnum.RR_REASSIGNED)).toBe("reassigned");
  });

  it("returns 'rerouted' for REROUTED", () => {
    expect(getAssignmentReasonCategory(AssignmentReasonEnum.REROUTED)).toBe("rerouted");
  });

  it("returns 'salesforce_assigned' for SALESFORCE_ASSIGNMENT", () => {
    expect(getAssignmentReasonCategory(AssignmentReasonEnum.SALESFORCE_ASSIGNMENT)).toBe(
      "salesforce_assigned"
    );
  });

  it("returns 'routed' for unknown enum values (default case)", () => {
    const unknownValue = "UNKNOWN_VALUE" as AssignmentReasonEnum;
    expect(getAssignmentReasonCategory(unknownValue)).toBe("routed");
  });
});
