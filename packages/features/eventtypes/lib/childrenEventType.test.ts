import type { MembershipRole } from "@calcom/prisma/enums";
import { describe, expect, it } from "vitest";
import { type ChildrenEventType, stripChildrenForPayload } from "./childrenEventType";

function createChild(overrides: Partial<ChildrenEventType> = {}): ChildrenEventType {
  return {
    value: "child-1",
    label: "Child 1",
    created: true,
    slug: "child-slug",
    hidden: false,
    owner: {
      avatar: "https://example.com/avatar.png",
      id: 1,
      email: "alice@example.com",
      name: "Alice",
      username: "alice",
      membership: "MEMBER" as MembershipRole,
      eventTypeSlugs: ["meeting", "standup"],
      profile: {
        upId: "usr_1",
        id: 1,
        username: "alice",
        organizationId: null,
        organization: null,
      },
    },
    ...overrides,
  };
}

describe("stripChildrenForPayload", () => {
  it("strips display fields from a single child", () => {
    const child = createChild();
    const result = stripChildrenForPayload([child]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      hidden: false,
      owner: {
        id: 1,
        name: "Alice",
        email: "alice@example.com",
        eventTypeSlugs: ["meeting", "standup"],
      },
    });
  });

  it("strips multiple children", () => {
    const children = [
      createChild({ hidden: false }),
      createChild({
        hidden: true,
        owner: { ...createChild().owner, id: 2, name: "Bob", email: "bob@example.com" },
      }),
      createChild({
        hidden: false,
        owner: { ...createChild().owner, id: 3, name: "Charlie", email: "charlie@example.com" },
      }),
    ];
    const result = stripChildrenForPayload(children);

    expect(result).toHaveLength(3);
    expect(result[0].owner.name).toBe("Alice");
    expect(result[1].owner.name).toBe("Bob");
    expect(result[1].hidden).toBe(true);
    expect(result[2].owner.name).toBe("Charlie");
  });

  it("returns empty array for empty input", () => {
    expect(stripChildrenForPayload([])).toEqual([]);
  });

  it("preserves empty eventTypeSlugs array", () => {
    const child = createChild({
      owner: { ...createChild().owner, eventTypeSlugs: [] },
    });
    const result = stripChildrenForPayload([child]);

    expect(result[0].owner.eventTypeSlugs).toEqual([]);
  });

  it("stripped fields are absent from result", () => {
    const child = createChild();
    const result = stripChildrenForPayload([child]);

    const childResult = result[0] as Record<string, unknown>;
    expect(childResult).not.toHaveProperty("avatar");
    expect(childResult).not.toHaveProperty("profile");
    expect(childResult).not.toHaveProperty("username");
    expect(childResult).not.toHaveProperty("membership");
    expect(childResult).not.toHaveProperty("value");
    expect(childResult).not.toHaveProperty("label");
    expect(childResult).not.toHaveProperty("created");
    expect(childResult).not.toHaveProperty("slug");

    const ownerResult = result[0].owner as Record<string, unknown>;
    expect(ownerResult).not.toHaveProperty("avatar");
    expect(ownerResult).not.toHaveProperty("profile");
    expect(ownerResult).not.toHaveProperty("username");
    expect(ownerResult).not.toHaveProperty("membership");
  });
});
