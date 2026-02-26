import { describe, expect, it } from "vitest";

import { areTheySiblingEntities } from "./entityPermissionUtils.shared";

describe("areTheySiblingEntities", () => {
  it("returns true when both entities share the same teamId", () => {
    expect(
      areTheySiblingEntities({
        entity1: { teamId: 1, userId: null },
        entity2: { teamId: 1, userId: null },
      })
    ).toBe(true);
  });

  it("returns false when entities have different teamIds", () => {
    expect(
      areTheySiblingEntities({
        entity1: { teamId: 1, userId: null },
        entity2: { teamId: 2, userId: null },
      })
    ).toBe(false);
  });

  it("returns false when entity1 has teamId but entity2 does not", () => {
    expect(
      areTheySiblingEntities({
        entity1: { teamId: 1, userId: null },
        entity2: { teamId: null, userId: 5 },
      })
    ).toBe(false);
  });

  it("returns true when both entities share the same userId (no team)", () => {
    expect(
      areTheySiblingEntities({
        entity1: { teamId: null, userId: 5 },
        entity2: { teamId: null, userId: 5 },
      })
    ).toBe(true);
  });

  it("returns false when both are user-level but different userIds", () => {
    expect(
      areTheySiblingEntities({
        entity1: { teamId: null, userId: 5 },
        entity2: { teamId: null, userId: 10 },
      })
    ).toBe(false);
  });

  it("returns false when entity1 is user-level but entity2 is team-level", () => {
    expect(
      areTheySiblingEntities({
        entity1: { teamId: null, userId: 5 },
        entity2: { teamId: 1, userId: null },
      })
    ).toBe(false);
  });

  it("returns true when entity1 has teamId, ignoring userId differences", () => {
    // When entity1 has teamId, only teamId is compared
    expect(
      areTheySiblingEntities({
        entity1: { teamId: 1, userId: 5 },
        entity2: { teamId: 1, userId: 10 },
      })
    ).toBe(true);
  });

  it("returns true when both have null teamId and null userId (null === null)", () => {
    expect(
      areTheySiblingEntities({
        entity1: { teamId: null, userId: null },
        entity2: { teamId: null, userId: null },
      })
    ).toBe(true);
  });
});
