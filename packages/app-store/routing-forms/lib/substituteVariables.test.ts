import { describe, it, expect } from "vitest";

import type { FormResponse, Field } from "../types/types";
import { substituteVariables } from "./substituteVariables";

describe("substituteVariables", () => {
  const createSelectField = (
    id: string,
    identifier: string,
    label: string,
    options?: Array<{ id: string; label: string }>
  ): Field => ({
    id,
    identifier,
    label,
    type: "select",
    options,
  });

  const createTextField = (id: string, identifier: string, label: string): Field => ({
    id,
    identifier,
    label,
    type: "text",
  });

  const createMultiselectField = (
    id: string,
    identifier: string,
    label: string,
    options?: Array<{ id: string; label: string }>
  ): Field => ({
    id,
    identifier,
    label,
    type: "multiselect",
    options,
  });

  const createFormResponse = (
    fieldId: string,
    value: string | string[] | number,
    label: string
  ): FormResponse => ({
    [fieldId]: {
      value,
      label,
    },
  });

  it("should substitute variables with option labels (not field labels or values)", () => {
    const fields = [
      createSelectField("field1", "department", "Department", [
        { id: "sales-123", label: "Sales Team" },
        { id: "eng-456", label: "Engineering" },
      ]),
    ];
    const routeValue = "/team/{department}/meeting";
    const response = createFormResponse("field1", "sales-123", "Department");

    const result = substituteVariables(routeValue, response, fields);

    expect(result).toBe("/team/Sales%20Team/meeting");
    expect(result).not.toBe("/team/sales-123/meeting");
    expect(result).not.toBe("/team/department/meeting");
  });

  it("should handle multiple variable substitutions", () => {
    const fields = [
      createSelectField("field1", "department", "Department", [{ id: "eng-456", label: "Engineering" }]),
      createTextField("field2", "teamName", "Team Name"),
    ];
    const routeValue = "/{department}/{teamName}/book";
    const response: FormResponse = {
      ...createFormResponse("field1", "eng-456", "Department"),
      ...createFormResponse("field2", "Backend Team", "Team Name"),
    };

    const result = substituteVariables(routeValue, response, fields);

    expect(result).toBe("/Engineering/Backend%20Team/book");
  });

  it("should handle special characters in labels by encoding them", () => {
    const fields = [
      createSelectField("field1", "department", "Department", [{ id: "hr_dept", label: "HR & Recruitment" }]),
    ];
    const routeValue = "/meeting/{department}";
    const response = createFormResponse("field1", "hr_dept", "Department");

    const result = substituteVariables(routeValue, response, fields);
    expect(result).toBe("/meeting/HR%20%26%20Recruitment");
  });

  it("should handle case-insensitive variable matching", () => {
    const fields = [
      createSelectField("field1", "department", "Department", [
        { id: "support-001", label: "Customer Support" },
      ]),
    ];
    const routeValue = "/team/{DEPARTMENT}/schedule";
    const response = createFormResponse("field1", "support-001", "Department");

    const result = substituteVariables(routeValue, response, fields);
    expect(result).toBe("/team/Customer%20Support/schedule");
  });

  it("should not substitute variables that don't have matching fields", () => {
    const fields = [createTextField("field1", "knownField", "Known Field")];
    const routeValue = "/team/{unknownField}/meeting";
    const response = createFormResponse("field1", "sales-123", "Sales Team");

    const result = substituteVariables(routeValue, response, fields);
    expect(result).toBe("/team/{unknownField}/meeting");
  });

  it("should handle array values in response labels", () => {
    const fields = [
      createMultiselectField("field3", "priority", "Priority Level", [
        { id: "high", label: "High" },
        { id: "urgent", label: "Urgent" },
      ]),
    ];
    const routeValue = "/priorities/{priority}";
    const response = createFormResponse("field3", ["high", "urgent"], "Priority Level");

    const result = substituteVariables(routeValue, response, fields);
    expect(result).toBe("/priorities/High%2CUrgent");
  });

  it("should handle numeric labels", () => {
    const fields = [
      createSelectField("field1", "department", "Department", [{ id: "room-id-123", label: "Room 404" }]),
    ];
    const routeValue = "/room/{department}";
    const response = createFormResponse("field1", "room-id-123", "Department");

    const result = substituteVariables(routeValue, response, fields);
    expect(result).toBe("/room/Room%20404");
  });

  it("should not modify the URL if no variables are present", () => {
    const fields = [createTextField("field1", "someField", "Some Field")];
    const routeValue = "/team/fixed/meeting";
    const response = createFormResponse("field1", "sales-123", "Sales Team");

    const result = substituteVariables(routeValue, response, fields);
    expect(result).toBe("/team/fixed/meeting");
  });

  it("should handle complex URLs with query parameters", () => {
    const fields = [
      createSelectField("field1", "department", "Department", [
        { id: "marketing-789", label: "Marketing & PR" },
      ]),
    ];
    const routeValue = "/event/{department}?type=meeting&priority=high";
    const response = createFormResponse("field1", "marketing-789", "Department");

    const result = substituteVariables(routeValue, response, fields);
    expect(result).toBe("/event/Marketing%20%26%20PR?type=meeting&priority=high");
  });

  it("should substitute text field values directly", () => {
    const fields = [createTextField("field1", "username", "Username")];
    const routeValue = "/user/{username}/profile";
    const response = createFormResponse("field1", "John Doe", "Username");

    const result = substituteVariables(routeValue, response, fields);
    expect(result).toBe("/user/John%20Doe/profile");
  });

  it("should handle number field values", () => {
    const fields = [
      { id: "field1", identifier: "employeeId", label: "Employee ID", type: "number" as const },
    ];
    const routeValue = "/employee/{employeeId}/details";
    const response = createFormResponse("field1", 12345, "Employee ID");

    const result = substituteVariables(routeValue, response, fields);
    expect(result).toBe("/employee/12345/details");
  });

  it("should handle multiple text and number fields in one URL", () => {
    const fields = [
      createTextField("field1", "department", "Department Name"),
      { id: "field2", identifier: "roomNumber", label: "Room Number", type: "number" as const },
      createTextField("field3", "building", "Building"),
    ];
    const routeValue = "/{building}/floor/{roomNumber}/{department}";
    const response: FormResponse = {
      ...createFormResponse("field1", "Engineering", "Department Name"),
      ...createFormResponse("field2", 404, "Room Number"),
      ...createFormResponse("field3", "Tower A", "Building"),
    };

    const result = substituteVariables(routeValue, response, fields);
    expect(result).toBe("/Tower%20A/floor/404/Engineering");
  });

  it("should handle text fields with special characters", () => {
    const fields = [createTextField("field1", "projectName", "Project Name")];
    const routeValue = "/project/{projectName}/board";
    const response = createFormResponse("field1", "Cal.com Platform & API", "Project Name");

    const result = substituteVariables(routeValue, response, fields);
    expect(result).toBe("/project/Cal.com%20Platform%20%26%20API/board");
  });

  it("should handle empty text field values", () => {
    const fields = [createTextField("field1", "optional", "Optional Field")];
    const routeValue = "/form/{optional}/submit";
    const response = createFormResponse("field1", "", "Optional Field");

    const result = substituteVariables(routeValue, response, fields);
    expect(result).toBe("/form//submit");
  });

  it("should handle textarea fields like text fields", () => {
    const fields = [
      { id: "field1", identifier: "description", label: "Description", type: "textarea" as const },
    ];
    const routeValue = "/ticket/{description}";
    const response = createFormResponse("field1", "Bug Report Summary", "Description");

    const result = substituteVariables(routeValue, response, fields);
    expect(result).toBe("/ticket/Bug%20Report%20Summary");
  });
});
