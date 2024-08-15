import { describe, it, expect } from "vitest";

import { buildResponsesForReporting } from "./report.handler";

describe("buildResponsesForReporting", () => {
  it("for fields with options, it should return the labels of the options", () => {
    const responsesFromDb = [
      {
        field1: { value: "value1" },
        field2: { value: ["option1", "option2"] },
      },
    ];

    const fields = [
      { id: "field1", label: "Field 1" },
      {
        id: "field2",
        label: "Field 2",
        options: [
          { id: "option1", label: "Option 1" },
          { id: "option2", label: "Option 2" },
        ],
      },
    ];

    const expectedResponses = [["value1", "Option 1, Option 2"]];

    const { responses, headers } = buildResponsesForReporting({ responsesFromDb, fields });
    expect(responses).toEqual(expectedResponses);
    expect(headers).toEqual(["Field 1", "Field 2"]);
  });

  it("for fields with options having null id(i.e. legacy fields), it should return what DB provided(as that would be labels only).", () => {
    const responsesFromDb = [
      {
        field1: { value: "value1" },
        field2: { value: ["Option 1", "Option 2"] },
      },
    ];

    const fields = [
      { id: "field1", label: "Field 1" },
      {
        id: "field2",
        label: "Field 2",
        options: [
          { id: null, label: "Option 1" },
          { id: null, label: "Option 2" },
        ],
      },
    ];

    const expectedResponses = [["value1", "Option 1, Option 2"]];

    const { responses, headers } = buildResponsesForReporting({ responsesFromDb, fields });
    expect(responses).toEqual(expectedResponses);
    expect(headers).toEqual(["Field 1", "Field 2"]);
  });

  it("should correctly handle numeric responses converting them to strings", () => {
    const responsesFromDb = [
      {
        field1: { value: 1 },
        field2: { value: [1, 2] },
      },
    ];

    const fields = [
      { id: "field1", label: "Field 1" },
      {
        id: "field2",
        label: "Field 2",
        options: [
          { id: null, label: "Option 1" },
          { id: null, label: "Option 2" },
        ],
      },
    ];
    const expectedResponses = [["1", "1, 2"]];
    const { responses, headers } = buildResponsesForReporting({ responsesFromDb, fields });
    expect(responses).toEqual(expectedResponses);
    expect(headers).toEqual(["Field 1", "Field 2"]);
  });

  it("should handle empty responses", () => {
    const responsesFromDb = [{}];

    const fields = [{ id: "field1", label: "Field 1" }];

    const expectedResponses = [[""]];

    const { responses, headers } = buildResponsesForReporting({ responsesFromDb, fields });
    expect(responses).toEqual(expectedResponses);
    expect(headers).toEqual(["Field 1"]);
  });

  it("should show correct header for deleted fields", () => {
    const responsesFromDb = [
      {
        field1: { value: "value1" },
        field2: { value: ["Option 1", "Option 2"] },
      },
    ];

    const fields = [
      { id: "field1", label: "Field 1" },
      {
        id: "field2",
        label: "Field 2",
        deleted: true,
        options: [
          { id: "option1", label: "Option 1" },
          { id: "option2", label: "Option 2" },
        ],
      },
    ];

    const expectedResponses = [["value1", "Option 1, Option 2"]];
    const expectedHeaders = ["Field 1", "Field 2(Deleted)"];

    const { responses, headers } = buildResponsesForReporting({ responsesFromDb, fields });
    expect(responses).toEqual(expectedResponses);
    expect(headers).toEqual(expectedHeaders);
  });
});
