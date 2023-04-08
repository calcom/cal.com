import { expect, it, describe } from "@jest/globals";

import { jsonLogicToPrisma } from "../../jsonLogicToPrisma";

afterEach(() => {
  jest.resetAllMocks();
});

describe("jsonLogicToPrisma - Single Query", () => {
  it("should support Short 'Equals' operator", () => {
    const prismaWhere = jsonLogicToPrisma({
      logic: { and: [{ "==": [{ var: "505d3c3c-aa71-4220-93a9-6fd1e1087939" }, "A"] }] },
    });
    expect(prismaWhere).toEqual({
      AND: [
        {
          response: {
            path: ["505d3c3c-aa71-4220-93a9-6fd1e1087939", "value"],
            equals: "A",
          },
        },
      ],
    });
  });

  it("should support Short 'Not Equals' operator", () => {
    const prismaWhere = jsonLogicToPrisma({
      logic: { and: [{ "!=": [{ var: "505d3c3c-aa71-4220-93a9-6fd1e1087939" }, "abc"] }] },
    });
    expect(prismaWhere).toEqual({
      AND: [
        {
          NOT: {
            response: {
              path: ["505d3c3c-aa71-4220-93a9-6fd1e1087939", "value"],
              equals: "abc",
            },
          },
        },
      ],
    });
  });

  it("should support Short 'Contains' operator", () => {
    const prismaWhere = jsonLogicToPrisma({
      logic: { and: [{ in: ["A", { var: "505d3c3c-aa71-4220-93a9-6fd1e1087939" }] }] },
    });
    expect(prismaWhere).toEqual({
      AND: [
        {
          response: {
            path: ["505d3c3c-aa71-4220-93a9-6fd1e1087939", "value"],
            string_contains: "A",
          },
        },
      ],
    });
  });

  it("should support Short 'Not Contains' operator", () => {
    const prismaWhere = jsonLogicToPrisma({
      logic: { and: [{ "!": { in: ["a", { var: "505d3c3c-aa71-4220-93a9-6fd1e1087939" }] } }] },
    });
    expect(prismaWhere).toEqual({
      AND: [
        {
          NOT: {
            response: {
              path: ["505d3c3c-aa71-4220-93a9-6fd1e1087939", "value"],
              string_contains: "a",
            },
          },
        },
      ],
    });
  });

  it("should support 'MultiSelect' 'Equals' operator", () => {
    const prismaWhere = jsonLogicToPrisma({
      logic: {
        and: [{ all: [{ var: "267c7817-81a5-4bef-9d5b-d0faa4cd0d71" }, { in: [{ var: "" }, ["C", "D"]] }] }],
      },
    });
    expect(prismaWhere).toEqual({
      AND: [
        { response: { path: ["267c7817-81a5-4bef-9d5b-d0faa4cd0d71", "value"], array_contains: ["C", "D"] } },
      ],
    });
  });
});
describe("jsonLogicToPrisma - Single Query", () => {
  it("should support where All Match ['Equals', 'Equals'] operator", () => {
    const prismaWhere = jsonLogicToPrisma({
      logic: {
        and: [
          { "==": [{ var: "505d3c3c-aa71-4220-93a9-6fd1e1087939" }, "a"] },
          { "==": [{ var: "505d3c3c-aa71-4220-93a9-6fd1e1087939" }, "b"] },
        ],
      },
    });

    expect(prismaWhere).toEqual({
      AND: [
        {
          response: {
            path: ["505d3c3c-aa71-4220-93a9-6fd1e1087939", "value"],
            equals: "a",
          },
        },
        {
          response: {
            path: ["505d3c3c-aa71-4220-93a9-6fd1e1087939", "value"],
            equals: "b",
          },
        },
      ],
    });
  });
  it("should support where Any Match ['Equals', 'Equals'] operator", () => {
    const prismaWhere = jsonLogicToPrisma({
      logic: {
        or: [
          { "==": [{ var: "505d3c3c-aa71-4220-93a9-6fd1e1087939" }, "a"] },
          { "==": [{ var: "505d3c3c-aa71-4220-93a9-6fd1e1087939" }, "b"] },
        ],
      },
    });

    expect(prismaWhere).toEqual({
      OR: [
        {
          response: {
            path: ["505d3c3c-aa71-4220-93a9-6fd1e1087939", "value"],
            equals: "a",
          },
        },
        {
          response: {
            path: ["505d3c3c-aa71-4220-93a9-6fd1e1087939", "value"],
            equals: "b",
          },
        },
      ],
    });
  });
  it("should support where None Match ['Equals', 'Equals'] operator", () => {
    const prismaWhere = jsonLogicToPrisma({
      logic: {
        "!": {
          or: [
            { "==": [{ var: "505d3c3c-aa71-4220-93a9-6fd1e1087939" }, "abc"] },
            { "==": [{ var: "505d3c3c-aa71-4220-93a9-6fd1e1087939" }, "abcd"] },
          ],
        },
      },
    });

    expect(prismaWhere).toEqual({
      NOT: {
        OR: [
          { response: { path: ["505d3c3c-aa71-4220-93a9-6fd1e1087939", "value"], equals: "abc" } },
          { response: { path: ["505d3c3c-aa71-4220-93a9-6fd1e1087939", "value"], equals: "abcd" } },
        ],
      },
    });
  });
});
