import type { Connection, DescribeSObjectResult, Field } from "@jsforce/jsforce-node";
import { describe, expect, it, vi } from "vitest";

import { SalesforceFieldType, WhenToWriteToRecord } from "./enums";
import { validateSalesforceFieldMappings } from "./validate-field-mappings";
import type { WriteToBookingEntry } from "../zod";

function makeField(overrides: Partial<Field> & { name: string }): Field {
  return {
    aggregatable: false,
    aiPredictionField: false,
    autoNumber: false,
    byteLength: 0,
    calculated: false,
    calculatedFormula: null,
    cascadeDelete: false,
    caseSensitive: false,
    compoundFieldName: null,
    controllerName: null,
    createable: true,
    custom: true,
    defaultValue: null,
    defaultValueFormula: null,
    defaultedOnCreate: false,
    dependentPicklist: false,
    deprecatedAndHidden: false,
    digits: 0,
    displayLocationInDecimal: false,
    encrypted: false,
    externalId: false,
    extraTypeInfo: null,
    filterable: true,
    filteredLookupInfo: null,
    formulaTreatNullNumberAsZero: false,
    groupable: true,
    highScaleNumber: false,
    htmlFormatted: false,
    idLookup: false,
    inlineHelpText: null,
    label: overrides.name,
    length: 255,
    mask: null,
    maskType: null,
    nameField: false,
    namePointing: false,
    nillable: true,
    permissionable: true,
    picklistValues: [],
    polymorphicForeignKey: false,
    precision: 0,
    queryByDistance: false,
    referenceTargetField: null,
    referenceTo: [],
    relationshipName: null,
    relationshipOrder: null,
    restrictedDelete: false,
    restrictedPicklist: false,
    scale: 0,
    searchPrefilterable: false,
    soapType: "xsd:string",
    sortable: true,
    type: "string",
    unique: false,
    updateable: true,
    writeRequiresMasterRead: false,
    ...overrides,
  } as Field;
}

function makeConnection(fields: Field[]): Connection {
  return {
    describe: vi.fn().mockResolvedValue({ fields } as unknown as DescribeSObjectResult),
  } as unknown as Connection;
}

function entry(
  fieldType: SalesforceFieldType,
  value: string | boolean
): WriteToBookingEntry {
  return { fieldType, value, whenToWrite: WhenToWriteToRecord.EVERY_BOOKING };
}

describe("validateSalesforceFieldMappings", () => {
  it("returns empty array for valid mappings", async () => {
    const conn = makeConnection([
      makeField({ name: "Custom_Text__c", type: "string", updateable: true }),
      makeField({
        name: "Is_Demo__c",
        type: "boolean",
        updateable: true,
      }),
    ]);

    const errors = await validateSalesforceFieldMappings(
      conn,
      {
        Custom_Text__c: entry(SalesforceFieldType.TEXT, "hello"),
        Is_Demo__c: entry(SalesforceFieldType.CHECKBOX, true),
      },
      "Event"
    );

    expect(errors).toEqual([]);
  });

  it("detects non-existent fields", async () => {
    const conn = makeConnection([makeField({ name: "Real_Field__c" })]);

    const errors = await validateSalesforceFieldMappings(
      conn,
      { Fake_Field__c: entry(SalesforceFieldType.TEXT, "test") },
      "Event"
    );

    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("Fake_Field__c");
    expect(errors[0].error).toContain("does not exist");
  });

  it("detects read-only fields", async () => {
    const conn = makeConnection([
      makeField({ name: "ReadOnly__c", updateable: false }),
    ]);

    const errors = await validateSalesforceFieldMappings(
      conn,
      { ReadOnly__c: entry(SalesforceFieldType.TEXT, "test") },
      "Event"
    );

    expect(errors).toHaveLength(1);
    expect(errors[0].error).toContain("read-only");
  });

  it("detects checkbox type mismatch — config says checkbox but SF field is not boolean", async () => {
    const conn = makeConnection([
      makeField({ name: "Text_Field__c", type: "string", updateable: true }),
    ]);

    const errors = await validateSalesforceFieldMappings(
      conn,
      { Text_Field__c: entry(SalesforceFieldType.CHECKBOX, true) },
      "Event"
    );

    expect(errors).toHaveLength(1);
    expect(errors[0].error).toContain("configured as Checkbox");
    expect(errors[0].error).toContain('"string"');
  });

  it("detects when SF field is boolean but config doesn't use checkbox type", async () => {
    const conn = makeConnection([
      makeField({ name: "Is_Demo__c", type: "boolean", updateable: true }),
    ]);

    const errors = await validateSalesforceFieldMappings(
      conn,
      { Is_Demo__c: entry(SalesforceFieldType.TEXT, "False") },
      "Event"
    );

    expect(errors).toHaveLength(1);
    expect(errors[0].error).toContain("Checkbox in Salesforce");
  });

  it("detects invalid picklist values", async () => {
    const conn = makeConnection([
      makeField({
        name: "Meeting_Type__c",
        type: "picklist",
        updateable: true,
        picklistValues: [
          { value: "Demo", active: true, defaultValue: false, label: "Demo" },
          { value: "Sales", active: true, defaultValue: false, label: "Sales" },
          { value: "Internal", active: true, defaultValue: false, label: "Internal" },
          { value: "Deprecated", active: false, defaultValue: false, label: "Deprecated" },
        ],
      } as Partial<Field> & { name: string }),
    ]);

    const errors = await validateSalesforceFieldMappings(
      conn,
      { Meeting_Type__c: entry(SalesforceFieldType.PICKLIST, "InvalidValue") },
      "Event"
    );

    expect(errors).toHaveLength(1);
    expect(errors[0].error).toContain('"InvalidValue"');
    expect(errors[0].error).toContain("Demo");
    expect(errors[0].error).toContain("Sales");
    expect(errors[0].error).not.toContain("Deprecated");
  });

  it("allows valid picklist values", async () => {
    const conn = makeConnection([
      makeField({
        name: "Meeting_Type__c",
        type: "picklist",
        updateable: true,
        picklistValues: [
          { value: "Demo", active: true, defaultValue: false, label: "Demo" },
          { value: "Sales", active: true, defaultValue: false, label: "Sales" },
        ],
      } as Partial<Field> & { name: string }),
    ]);

    const errors = await validateSalesforceFieldMappings(
      conn,
      { Meeting_Type__c: entry(SalesforceFieldType.PICKLIST, "Demo") },
      "Event"
    );

    expect(errors).toEqual([]);
  });

  it("handles describe() failure gracefully", async () => {
    const conn = {
      describe: vi.fn().mockRejectedValue(new Error("INVALID_SESSION_ID")),
    } as unknown as Connection;

    const errors = await validateSalesforceFieldMappings(
      conn,
      { Some_Field__c: entry(SalesforceFieldType.TEXT, "test") },
      "Event"
    );

    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("*");
    expect(errors[0].error).toContain("could not describe");
  });

  it("returns empty array for empty mappings", async () => {
    const conn = makeConnection([]);

    const errors = await validateSalesforceFieldMappings(conn, {}, "Event");

    expect(errors).toEqual([]);
    expect(conn.describe).not.toHaveBeenCalled();
  });

  it("skips type validation for legacy string/boolean entries", async () => {
    const conn = makeConnection([
      makeField({ name: "Legacy_Field__c", type: "string", updateable: true }),
    ]);

    const errors = await validateSalesforceFieldMappings(
      conn,
      { Legacy_Field__c: "some legacy value" },
      "Event"
    );

    expect(errors).toEqual([]);
  });

  it("reports multiple errors across different fields", async () => {
    const conn = makeConnection([
      makeField({ name: "Real_Field__c", type: "string", updateable: true }),
      makeField({ name: "ReadOnly__c", type: "string", updateable: false }),
    ]);

    const errors = await validateSalesforceFieldMappings(
      conn,
      {
        Fake_Field__c: entry(SalesforceFieldType.TEXT, "test"),
        ReadOnly__c: entry(SalesforceFieldType.TEXT, "test"),
        Real_Field__c: entry(SalesforceFieldType.TEXT, "test"),
      },
      "Event"
    );

    expect(errors).toHaveLength(2);
    const fieldNames = errors.map((e) => e.field);
    expect(fieldNames).toContain("Fake_Field__c");
    expect(fieldNames).toContain("ReadOnly__c");
  });
});
