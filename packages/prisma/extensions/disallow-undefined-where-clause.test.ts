import { describe, it, expect } from "vitest";

import { validateWhereClause } from "./disallow-undefined-where-clause";

describe("Disallow undefined where", () => {
  it("validateWhereClause should throw exception when the 'in' field of where object is undefined", async () => {
    const where = {
      id: {
        in: undefined,
      },
    };

    expect(() => validateWhereClause(where)).toThrowError(
      'The "in" value for the field "id" cannot be undefined.'
    );
  });

  it("validateWhereClause should throw exception when a field of where object is undefined", async () => {
    const where = {
      from: undefined,
    };

    expect(() => validateWhereClause(where)).toThrowError(
      'The value for the field "from" cannot be undefined.'
    );
  });

  it("validateWhereClause should not throw exception when the where object does not contain undefined values", async () => {
    const where = {
      id: {
        in: [1, 2, 3],
      },
      name: "test name",
    };

    validateWhereClause(where);
  });

  it("validateWhereClause should not throw exception when the where object contain null values", async () => {
    const where = {
      teamId: null,
      parentId: null,
    };

    validateWhereClause(where);
  });

  it("validateWhereClause should throw exception when the where object contain null values and 'in' field is undefined", async () => {
    const where = {
      teamId: null,
      parentId: null,
      id: {
        in: undefined,
      },
    };

    expect(() => validateWhereClause(where)).toThrowError(
      'The "in" value for the field "id" cannot be undefined.'
    );
  });

  it("validateWhereClause should throw exception when the where object is undefined", async () => {
    const where = undefined;

    expect(() => validateWhereClause(where)).toThrowError('The "where" clause cannot be undefined.');
  });

  it("validateWhereClause should throw exception when the where object is {}", async () => {
    const where = {};

    expect(() => validateWhereClause(where)).toThrowError('The "where" clause cannot be an empty object {}.');
  });

  it("validateWhereClause should throw exception when the where object is []", async () => {
    const where = [];

    expect(() => validateWhereClause(where)).toThrowError('The "where" clause cannot be an empty array [].');
  });
});
