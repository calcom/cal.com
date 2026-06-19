import { describe, expect, it } from "vitest";

import { isJwtIssuedBeforePasswordChange } from "./isJwtIssuedBeforePasswordChange";

describe("isJwtIssuedBeforePasswordChange", () => {
  const changedAt = new Date("2026-06-19T12:00:00.000Z");
  const changedAtSeconds = Math.floor(changedAt.getTime() / 1000);

  it("revokes a token issued before the password change", () => {
    expect(isJwtIssuedBeforePasswordChange(changedAtSeconds - 60, changedAt)).toBe(true);
  });

  it("revokes a token issued in the same whole second as the change (fail closed)", () => {
    expect(isJwtIssuedBeforePasswordChange(changedAtSeconds, changedAt)).toBe(true);
  });

  it("keeps a token issued after the password change", () => {
    expect(isJwtIssuedBeforePasswordChange(changedAtSeconds + 1, changedAt)).toBe(false);
  });

  it("never revokes when passwordChangedAt is null (password never changed)", () => {
    expect(isJwtIssuedBeforePasswordChange(changedAtSeconds - 60, null)).toBe(false);
  });

  it("never revokes when passwordChangedAt is undefined", () => {
    expect(isJwtIssuedBeforePasswordChange(changedAtSeconds - 60, undefined)).toBe(false);
  });

  it("does not revoke when the token has no iat", () => {
    expect(isJwtIssuedBeforePasswordChange(undefined, changedAt)).toBe(false);
    expect(isJwtIssuedBeforePasswordChange(null, changedAt)).toBe(false);
  });

  it("floors passwordChangedAt to whole seconds to match iat granularity", () => {
    // passwordChangedAt 999ms into the same second the token was issued.
    const withSubSecond = new Date(changedAt.getTime() + 999);
    expect(isJwtIssuedBeforePasswordChange(changedAtSeconds, withSubSecond)).toBe(true);
    expect(isJwtIssuedBeforePasswordChange(changedAtSeconds + 1, withSubSecond)).toBe(false);
  });
});
