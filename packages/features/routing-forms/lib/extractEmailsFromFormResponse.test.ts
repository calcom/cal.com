import { describe, expect, it } from "vitest";

import { extractEmailsFromFormResponse } from "./extractEmailsFromFormResponse";

describe("extractEmailsFromFormResponse", () => {
  it("returns empty array when no email identifier exists", () => {
    const fields = [
      { id: "workEmail", type: "email", identifier: "work_email" },
      { id: "personalEmail", type: "email", identifier: "personal_email" },
    ];
    const response = {
      workEmail: { value: "work@example.com", label: "Work Email" },
      personalEmail: { value: "personal@example.com", label: "Personal Email" },
    };

    expect(extractEmailsFromFormResponse(fields, response)).toEqual([]);
  });

  it("extracts value from the special email identifier field", () => {
    const fields = [
      { id: "name", type: "text" },
      { id: "bookerEmail", type: "email", identifier: "email" },
    ];
    const response = {
      name: { value: "John", label: "Name" },
      bookerEmail: { value: "john@example.com", label: "Booker Email" },
    };

    expect(extractEmailsFromFormResponse(fields, response)).toEqual(["john@example.com"]);
  });

  it("extracts only the special email identifier field even with multiple email fields", () => {
    const fields = [
      { id: "bookerEmail", type: "email", identifier: "email" },
      { id: "secondaryEmail", type: "email", identifier: "secondary_email" },
    ];
    const response = {
      bookerEmail: { value: "alice@example.com", label: "Booker Email" },
      secondaryEmail: { value: "bob@example.com", label: "Secondary Email" },
    };

    expect(extractEmailsFromFormResponse(fields, response)).toEqual(["alice@example.com"]);
  });

  it("skips email identifier field with no response entry", () => {
    const fields = [{ id: "bookerEmail", type: "email", identifier: "email" }];
    const response = {};

    expect(extractEmailsFromFormResponse(fields, response)).toEqual([]);
  });

  it("skips email identifier field with empty string value", () => {
    const fields = [{ id: "bookerEmail", type: "email", identifier: "email" }];
    const response = {
      bookerEmail: { value: "  ", label: "Booker Email" },
    };

    expect(extractEmailsFromFormResponse(fields, response)).toEqual([]);
  });

  it("skips email identifier field with non-string value", () => {
    const fields = [{ id: "bookerEmail", type: "email", identifier: "email" }];
    const response = {
      bookerEmail: { value: 123, label: "Booker Email" },
    };

    expect(extractEmailsFromFormResponse(fields, response)).toEqual([]);
  });

  it("trims whitespace from email identifier values", () => {
    const fields = [{ id: "bookerEmail", type: "email", identifier: "email" }];
    const response = {
      bookerEmail: { value: "  user@example.com  ", label: "Booker Email" },
    };

    expect(extractEmailsFromFormResponse(fields, response)).toEqual(["user@example.com"]);
  });

  it("uses first value when email identifier value is an array", () => {
    const fields = [{ id: "bookerEmail", type: "email", identifier: "email" }];
    const response = {
      bookerEmail: { value: ["first@example.com", "second@example.com"], label: "Booker Email" },
    };

    expect(extractEmailsFromFormResponse(fields, response)).toEqual(["first@example.com"]);
  });
});
