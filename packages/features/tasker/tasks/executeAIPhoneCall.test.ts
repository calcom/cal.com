import { getVariableFormats } from "@calcom/features/ee/workflows/lib/reminders/templates/customTemplate";
import { describe, expect, it } from "vitest";

describe("executeAIPhoneCall - variable formats", () => {
  describe("getVariableFormats integration for form responses", () => {
    it("should generate both variable formats for identifiers with underscores", () => {
      const responses = {
        Company_Name: { value: "Acme Corp" },
        Monthly_Infrastructure_Spend: { value: "$5000" },
      };

      const variables = Object.fromEntries(
        Object.entries(responses).flatMap(([key, value]) => {
          const formats = getVariableFormats(key);
          const valueStr = value.value?.toString() || "";
          return formats.map((format) => [format, valueStr]);
        })
      );

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

      const variables = Object.fromEntries(
        Object.entries(responses).flatMap(([key, value]) => {
          const formats = getVariableFormats(key);
          const valueStr = value.value?.toString() || "";
          return formats.map((format) => [format, valueStr]);
        })
      );

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

      const variables = Object.fromEntries(
        Object.entries(responses).flatMap(([key, value]) => {
          const formats = getVariableFormats(key);
          const valueStr = value.value?.toString() || "";
          return formats.map((format) => [format, valueStr]);
        })
      );

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

      const variables = Object.fromEntries(
        Object.entries(responses).flatMap(([key, value]) => {
          const formats = getVariableFormats(key);
          const valueStr = value.value?.toString() || "";
          return formats.map((format) => [format, valueStr]);
        })
      );

      expect(variables.TEST_FIELD).toBe(testValue);
      expect(variables.TESTFIELD).toBe(testValue);
      expect(variables.TEST_FIELD).toBe(variables.TESTFIELD);
    });
  });
});
