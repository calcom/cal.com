import { convertResponsesToVariableFormats } from "@calcom/features/tasker/tasks/executeAIPhoneCall";
import { describe, expect, it } from "vitest";

describe("executeAIPhoneCall - convertResponsesToVariableFormats", () => {
  it("should generate both variable formats for identifiers with underscores", () => {
    const responses = {
      Company_Name: { value: "Acme Corp" },
      Monthly_Infrastructure_Spend: { value: "$5000" },
    };

    const variables = convertResponsesToVariableFormats(responses);

    // Should have both underscore and non-underscore versions
    expect(variables.COMPANY_NAME).toBe("Acme Corp");
    expect(variables.COMPANYNAME).toBe("Acme Corp");
    expect(variables.MONTHLY_INFRASTRUCTURE_SPEND).toBe("$5000");
    expect(variables.MONTHLYINFRASTRUCTURESPEND).toBe("$5000");
  });

  it("should generate single format for identifiers without underscores", () => {
    const responses = {
      "Company Name": { value: "Acme Corp" },
      Email: { value: "test@example.com" },
    };

    const variables = convertResponsesToVariableFormats(responses);

    // Space-separated identifiers convert to underscore format
    expect(variables.COMPANY_NAME).toBe("Acme Corp");
    // Simple identifiers stay as-is
    expect(variables.EMAIL).toBe("test@example.com");
  });

  it("should handle mixed identifiers correctly", () => {
    const responses = {
      Company_Name: { value: "Acme Corp" },
      "Contact Email": { value: "contact@acme.com" },
      Notes: { value: "Some notes" },
    };

    const variables = convertResponsesToVariableFormats(responses);

    // Underscore identifier: both formats
    expect(variables.COMPANY_NAME).toBe("Acme Corp");
    expect(variables.COMPANYNAME).toBe("Acme Corp");

    // Space identifier: single format (space becomes underscore)
    expect(variables.CONTACT_EMAIL).toBe("contact@acme.com");

    // Simple identifier: single format
    expect(variables.NOTES).toBe("Some notes");
  });

  it("should preserve the same value for both variable formats", () => {
    const testValue = "Test Value 123";
    const responses = {
      Test_Field: { value: testValue },
    };

    const variables = convertResponsesToVariableFormats(responses);

    expect(variables.TEST_FIELD).toBe(testValue);
    expect(variables.TESTFIELD).toBe(testValue);
    expect(variables.TEST_FIELD).toBe(variables.TESTFIELD);
  });

  it("should handle empty responses", () => {
    const responses = {};

    const variables = convertResponsesToVariableFormats(responses);

    expect(Object.keys(variables)).toHaveLength(0);
  });

  it("should handle undefined values", () => {
    const responses = {
      Field_Name: { value: undefined },
    };

    const variables = convertResponsesToVariableFormats(responses);

    expect(variables.FIELD_NAME).toBe("");
    expect(variables.FIELDNAME).toBe("");
  });
});
