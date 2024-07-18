import { describe, it, expect } from "vitest";

import { checkUndefinedInValue } from "./disallow-undefined-in-delete-update-many";

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
});
