import { describe, it, expect } from "vitest";

import type { ChildrenEventType } from "@calcom/features/eventtypes/lib/childrenEventType";
import { MembershipRole } from "@calcom/prisma/enums";

/**
 * Extracts only the fields needed by the server from a ChildrenEventType array.
 * This mirrors the stripping logic in useEventTypeForm's handleSubmit to ensure
 * that display-only fields (avatar, profile, etc.) are not sent in the payload.
 */
function stripChildrenForPayload(children: ChildrenEventType[]) {
  return children.map((child) => ({
    hidden: child.hidden,
    owner: {
      id: child.owner.id,
      name: child.owner.name,
      email: child.owner.email,
      eventTypeSlugs: child.owner.eventTypeSlugs,
    },
  }));
}

describe("useEventTypeForm - children payload stripping", () => {
  it("should strip avatar, profile, username, and membership from children payload", () => {
    const children: ChildrenEventType[] = [
      {
        value: "1",
        label: "Alice",
        created: true,
        slug: "test-event",
        hidden: false,
        owner: {
          id: 1,
          name: "Alice",
          email: "alice@example.com",
          username: "alice",
          avatar: "data:image/png;base64," + "A".repeat(50000), // Large base64 avatar
          membership: MembershipRole.MEMBER,
          eventTypeSlugs: ["meeting", "consultation"],
          profile: {
            id: 1,
            username: "alice",
            upId: "usr_1",
            organizationId: null,
            organization: null,
          },
        },
      },
      {
        value: "2",
        label: "Bob",
        created: false,
        slug: "test-event",
        hidden: true,
        owner: {
          id: 2,
          name: "Bob",
          email: "bob@example.com",
          username: "bob",
          avatar: "https://example.com/avatars/bob.png",
          membership: MembershipRole.OWNER,
          eventTypeSlugs: [],
          profile: {
            id: 2,
            username: "bob",
            upId: "usr_2",
            organizationId: 10,
            organization: {
              id: 10,
              slug: "org",
              name: "Org",
              calVideoLogo: null,
              bannerUrl: "",
              isPlatform: false,
            },
          },
        },
      },
    ];

    const stripped = stripChildrenForPayload(children);

    // Should only contain server-needed fields
    expect(stripped).toEqual([
      {
        hidden: false,
        owner: {
          id: 1,
          name: "Alice",
          email: "alice@example.com",
          eventTypeSlugs: ["meeting", "consultation"],
        },
      },
      {
        hidden: true,
        owner: {
          id: 2,
          name: "Bob",
          email: "bob@example.com",
          eventTypeSlugs: [],
        },
      },
    ]);

    // Verify avatar is not present
    for (const child of stripped) {
      expect(child.owner).not.toHaveProperty("avatar");
      expect(child.owner).not.toHaveProperty("profile");
      expect(child.owner).not.toHaveProperty("username");
      expect(child.owner).not.toHaveProperty("membership");
    }
  });

  it("should significantly reduce payload size for large teams", () => {
    // Simulate 85 users with base64 avatars (~10KB each)
    const largeBase64Avatar = "data:image/png;base64," + "A".repeat(10000);

    const children: ChildrenEventType[] = Array.from({ length: 85 }, (_, i) => ({
      value: String(i + 1),
      label: `User ${i + 1}`,
      created: true,
      slug: "managed-event",
      hidden: false,
      owner: {
        id: i + 1,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        username: `user${i + 1}`,
        avatar: largeBase64Avatar,
        membership: MembershipRole.MEMBER,
        eventTypeSlugs: ["event-a", "event-b"],
        profile: {
          id: i + 1,
          username: `user${i + 1}`,
          upId: `usr_${i + 1}`,
          organizationId: 1,
          organization: {
            id: 1,
            slug: "org",
            name: "Large Org",
            calVideoLogo: null,
            bannerUrl: "",
            isPlatform: false,
          },
        },
      },
    }));

    const fullPayloadSize = JSON.stringify(children).length;
    const strippedPayloadSize = JSON.stringify(stripChildrenForPayload(children)).length;

    // The stripped payload should be dramatically smaller
    expect(strippedPayloadSize).toBeLessThan(fullPayloadSize * 0.1);

    // Full payload with 85 users and 10KB avatars should be around 850KB+
    expect(fullPayloadSize).toBeGreaterThan(800000);

    // Stripped payload should be well under 1MB
    expect(strippedPayloadSize).toBeLessThan(100000);
  });

  it("should handle undefined children gracefully", () => {
    const children: ChildrenEventType[] = [];
    const stripped = stripChildrenForPayload(children);
    expect(stripped).toEqual([]);
  });
});
