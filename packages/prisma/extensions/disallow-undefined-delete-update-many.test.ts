import { describe, it, expect } from "vitest";

import { checkUndefinedInValue } from "./disallow-undefined-delete-update-many";

describe("Disallow undefined delete/update many", () => {
  it("checkUndefinedInValue should throw exception when the 'in' field of where object is undefined", async () => {
    const where = {
      id: {
        in: undefined,
      },
    };

    expect(() => checkUndefinedInValue(where)).toThrowError(
      'The "in" value for the field "id" cannot be undefined.'
    );
  });

  it("checkUndefinedInValue should throw exception when a field of where object is undefined", async () => {
    const where = {
      from: undefined,
    };

    expect(() => checkUndefinedInValue(where)).toThrowError(
      'The value for the field "from" cannot be undefined.'
    );
  });

  it("checkUndefinedInValue should not throw exception when the where object does not contain undefined values", async () => {
    const where = {
      id: {
        in: [1, 2, 3],
      },
      name: "test name",
    };

    checkUndefinedInValue(where);
  });
});
