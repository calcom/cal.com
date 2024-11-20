import { v4 as uuidv4 } from "uuid";
import { describe, it, expect } from "vitest";

import { buildResponsesForReporting } from "./report.handler";

describe("buildResponsesForReporting", () => {
  it("for fields with options, it should return the labels of the options", () => {
    const field1Id = uuidv4();
    const field2Id = uuidv4();

    const responsesFromDb = [
      {
        [field1Id]: { value: "value1" },
        [field2Id]: { value: ["option1", "option2"] },
      },
    ];

    const fields = [
      { id: field1Id, label: "Field 1" },
      {
        id: field2Id,
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

  it("for fields with options having null id, it should return what DB provided(as that would be labels only).", () => {
    const field1Id = uuidv4();
    const field2Id = uuidv4();
    const responsesFromDb = [
      {
        [field1Id]: { value: "value1" },
        [field2Id]: { value: ["Option 1", "Option 2"] },
      },
    ];

    const fields = [
      { id: field1Id, label: "Field 1" },
      {
        id: field2Id,
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

  it("for fields with no options but having array value, it should return the value as is", () => {
    const field2Id = uuidv4();
    const responsesFromDb = [
      {
        [field2Id]: { value: ["Option 1", "Option 2"] },
      },
    ];

    const fields = [
      {
        id: field2Id,
        label: "Field 2",
      },
    ];

    const expectedResponses = [["Option 1, Option 2"]];

    const { responses, headers } = buildResponsesForReporting({ responsesFromDb, fields });
    expect(responses).toEqual(expectedResponses);
    expect(headers).toEqual(["Field 2"]);
  });

  it("should correctly handle numeric responses converting them to strings", () => {
    const field1Id = uuidv4();
    const field2Id = uuidv4();
    const responsesFromDb = [
      {
        [field1Id]: { value: 1 },
        [field2Id]: { value: [1, 2] },
      },
    ];

    const fields = [
      { id: field1Id, label: "Field 1" },
      {
        id: field2Id,
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
    const field1Id = uuidv4();
    const responsesFromDb = [{}];

    const fields = [{ id: field1Id, label: "Field 1" }];

    const expectedResponses = [[""]];

    const { responses, headers } = buildResponsesForReporting({ responsesFromDb, fields });
    expect(responses).toEqual(expectedResponses);
    expect(headers).toEqual(["Field 1"]);
  });

  it("should show correct header for deleted fields", () => {
    const field1Id = uuidv4();
    const field2Id = uuidv4();
    const responsesFromDb = [
      {
        [field1Id]: { value: "value1" },
        [field2Id]: { value: ["Option 1", "Option 2"] },
      },
    ];

    const fields = [
      { id: field1Id, label: "Field 1" },
      {
        id: field2Id,
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
