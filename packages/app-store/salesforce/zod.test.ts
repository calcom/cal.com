import { describe, expect, it } from "vitest";
import { DateFieldTypeData, SalesforceFieldType, WhenToWriteToRecord } from "./lib/enums";
import { appDataSchema, isWriteToBookingEntry, validateFieldMapping } from "./zod";

describe("salesforce zod schemas", () => {
  it("validates appDataSchema with optional boolean field", () => {
    const result = appDataSchema.safeParse({
      enabled: true,
      roundRobinLeadSkip: true,
    });
    expect(result.success).toBe(true);
  });

  it("validates appDataSchema with minimal data", () => {
    const result = appDataSchema.safeParse({ enabled: false });
    expect(result.success).toBe(true);
  });
});

describe("isWriteToBookingEntry", () => {
  it("returns true for a valid typed config object", () => {
    expect(
      isWriteToBookingEntry({
        value: "hello",
        fieldType: SalesforceFieldType.TEXT,
        whenToWrite: WhenToWriteToRecord.EVERY_BOOKING,
      })
    ).toBe(true);
  });

  it("returns true for a boolean value config", () => {
    expect(
      isWriteToBookingEntry({
        value: true,
        fieldType: SalesforceFieldType.CHECKBOX,
        whenToWrite: WhenToWriteToRecord.EVERY_BOOKING,
      })
    ).toBe(true);
  });

  it("returns false for a plain string (legacy format)", () => {
    expect(isWriteToBookingEntry("some value")).toBe(false);
  });

  it("returns false for a plain boolean (legacy format)", () => {
    expect(isWriteToBookingEntry(true)).toBe(false);
  });

  it("returns false for null", () => {
    expect(isWriteToBookingEntry(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isWriteToBookingEntry(undefined)).toBe(false);
  });

  it("returns false for a number", () => {
    expect(isWriteToBookingEntry(0)).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isWriteToBookingEntry("")).toBe(false);
  });

  it("returns false for an object missing fieldType", () => {
    expect(isWriteToBookingEntry({ value: "test" })).toBe(false);
  });

  it("returns false for an object missing value", () => {
    expect(isWriteToBookingEntry({ fieldType: "string" })).toBe(false);
  });

  it("returns true for an object with value and fieldType (even without whenToWrite)", () => {
    expect(isWriteToBookingEntry({ value: "x", fieldType: "string" })).toBe(true);
  });
});

describe("validateFieldMapping", () => {
  it("returns null for a valid text field", () => {
    expect(
      validateFieldMapping({
        field: "Description__c",
        fieldType: SalesforceFieldType.TEXT,
        value: "hello world",
      })
    ).toBeNull();
  });

  it("returns null for a valid checkbox field with boolean true", () => {
    expect(
      validateFieldMapping({
        field: "Is_Active__c",
        fieldType: SalesforceFieldType.CHECKBOX,
        value: true,
      })
    ).toBeNull();
  });

  it("returns null for a valid checkbox field with boolean false", () => {
    expect(
      validateFieldMapping({
        field: "Is_Active__c",
        fieldType: SalesforceFieldType.CHECKBOX,
        value: false,
      })
    ).toBeNull();
  });

  it("returns error for checkbox field with string value", () => {
    const result = validateFieldMapping({
      field: "Event_Cancelled__c",
      fieldType: SalesforceFieldType.CHECKBOX,
      value: "False",
    });
    expect(result).toContain("Checkbox field");
    expect(result).toContain("boolean");
  });

  it("returns null for a valid date field with booking start date", () => {
    expect(
      validateFieldMapping({
        field: "Start_Date__c",
        fieldType: SalesforceFieldType.DATE,
        value: DateFieldTypeData.BOOKING_START_DATE,
      })
    ).toBeNull();
  });

  it("returns null for a valid date field with booking created date", () => {
    expect(
      validateFieldMapping({
        field: "Created__c",
        fieldType: SalesforceFieldType.DATE,
        value: DateFieldTypeData.BOOKING_CREATED_DATE,
      })
    ).toBeNull();
  });

  it("returns error for date field with arbitrary string", () => {
    const result = validateFieldMapping({
      field: "Start_Date__c",
      fieldType: SalesforceFieldType.DATE,
      value: "2024-01-01",
    });
    expect(result).toContain("Date field");
    expect(result).toContain("valid date reference");
  });

  it("returns error for empty field name", () => {
    expect(
      validateFieldMapping({
        field: "   ",
        fieldType: SalesforceFieldType.TEXT,
        value: "hello",
      })
    ).toBe("Field name is required");
  });

  it("returns error for text field with empty value", () => {
    const result = validateFieldMapping({
      field: "Name__c",
      fieldType: SalesforceFieldType.TEXT,
      value: "   ",
    });
    expect(result).toContain("non-empty text value");
  });

  it("returns null for a valid phone field", () => {
    expect(
      validateFieldMapping({
        field: "Phone__c",
        fieldType: SalesforceFieldType.PHONE,
        value: "+1234567890",
      })
    ).toBeNull();
  });

  it("returns null for a valid picklist field", () => {
    expect(
      validateFieldMapping({
        field: "Status__c",
        fieldType: SalesforceFieldType.PICKLIST,
        value: "Active",
      })
    ).toBeNull();
  });

  it("returns null for a valid custom field", () => {
    expect(
      validateFieldMapping({
        field: "Custom__c",
        fieldType: SalesforceFieldType.CUSTOM,
        value: "custom value",
      })
    ).toBeNull();
  });

  it("returns error for picklist field with empty value", () => {
    const result = validateFieldMapping({
      field: "Status__c",
      fieldType: SalesforceFieldType.PICKLIST,
      value: "",
    });
    expect(result).toContain("non-empty text value");
  });
});

describe("lastSyncError in appDataSchema", () => {
  it("accepts appData with lastSyncError", () => {
    const result = appDataSchema.safeParse({
      enabled: true,
      lastSyncError: {
        timestamp: "2024-01-01T00:00:00.000Z",
        errorCode: "JSON_PARSER_ERROR",
        errorMessage: "Invalid value for checkbox field",
        droppedFields: ["Event_Cancelled__c"],
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts appData with lastSyncError set to null", () => {
    const result = appDataSchema.safeParse({
      enabled: true,
      lastSyncError: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts appData without lastSyncError", () => {
    const result = appDataSchema.safeParse({
      enabled: true,
    });
    expect(result.success).toBe(true);
  });
});
