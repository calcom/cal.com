import { describe, expect, it } from "vitest";

import { getSubmitterEmail, getSubmitterName } from "./formSubmissionValidation";

describe("getSubmitterEmail", () => {
  it("should extract email from response with string value containing @", () => {
    const responses = {
      email: { value: "test@example.com", label: "Email" },
      name: { value: "John Doe", label: "Name" },
    };

    expect(getSubmitterEmail(responses)).toBe("test@example.com");
  });

  it("should return first email found when multiple fields contain @", () => {
    const responses = {
      email: { value: "first@example.com", label: "Email" },
      secondEmail: { value: "second@example.com", label: "Secondary Email" },
    };

    expect(getSubmitterEmail(responses)).toBe("first@example.com");
  });

  it("should return undefined when no field contains @", () => {
    const responses = {
      name: { value: "John Doe", label: "Name" },
      phone: { value: "123-456-7890", label: "Phone" },
    };

    expect(getSubmitterEmail(responses)).toBeUndefined();
  });

  it("should return undefined for empty responses", () => {
    const responses = {};

    expect(getSubmitterEmail(responses)).toBeUndefined();
  });

  it("should handle numeric values without crashing", () => {
    const responses = {
      age: { value: 25, label: "Age" },
      email: { value: "test@example.com", label: "Email" },
    };

    expect(getSubmitterEmail(responses)).toBe("test@example.com");
  });

  it("should handle array values without crashing", () => {
    const responses = {
      options: { value: ["option1", "option2"], label: "Options" },
      email: { value: "test@example.com", label: "Email" },
    };

    expect(getSubmitterEmail(responses)).toBe("test@example.com");
  });

  it("should return undefined when value is an array containing email-like strings", () => {
    const responses = {
      options: { value: ["test@example.com", "other"], label: "Options" },
    };

    expect(getSubmitterEmail(responses)).toBeUndefined();
  });

  it("should return undefined when value is a number", () => {
    const responses = {
      count: { value: 42, label: "Count" },
    };

    expect(getSubmitterEmail(responses)).toBeUndefined();
  });

  it("should handle response format with additional properties", () => {
    const responses = {
      email: {
        value: "test@example.com",
        label: "Email",
        response: "test@example.com",
        identifier: "email",
      },
    };

    expect(getSubmitterEmail(responses)).toBe("test@example.com");
  });

  it("should work with handleResponse.ts response format (value + label)", () => {
    const responses = {
      email: { value: "user@domain.com", label: "Email" },
      name: { value: "Jane Smith", label: "Name" },
    };

    expect(getSubmitterEmail(responses)).toBe("user@domain.com");
  });
});

describe("getSubmitterName", () => {
  it("should extract name from name field", () => {
    const responses = {
      name: { value: "John Doe", response: "John Doe" },
      email: { value: "john@example.com", response: "john@example.com" },
    };

    expect(getSubmitterName(responses)).toBe("John Doe");
  });

  it("should extract name from firstName field when name is not present", () => {
    const responses = {
      firstName: { value: "Jane", response: "Jane" },
      email: { value: "jane@example.com", response: "jane@example.com" },
    };

    expect(getSubmitterName(responses)).toBe("Jane");
  });

  it("should extract name from lastName field when name and firstName are not present", () => {
    const responses = {
      lastName: { value: "Smith", response: "Smith" },
      email: { value: "smith@example.com", response: "smith@example.com" },
    };

    expect(getSubmitterName(responses)).toBe("Smith");
  });

  it("should return undefined when no name fields are present", () => {
    const responses = {
      email: { value: "test@example.com", response: "test@example.com" },
      phone: { value: "123-456-7890", response: "123-456-7890" },
    };

    expect(getSubmitterName(responses)).toBeUndefined();
  });

  it("should prefer response property over value property", () => {
    const responses = {
      name: { value: "Value Name", response: "Response Name" },
    };

    expect(getSubmitterName(responses)).toBe("Response Name");
  });

  it("should fall back to value when response is not a string", () => {
    const responses = {
      name: { value: "Value Name", response: 123 },
    };

    expect(getSubmitterName(responses)).toBe("Value Name");
  });
});
