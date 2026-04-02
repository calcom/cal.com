import { describe, expect, it } from "vitest";
import { isAuthorizedToViewFormOnOrgDomain } from "./isAuthorizedToViewForm";

const _createUser = (overrides = {}) => ({
  username: "testuser",
  metadata: {},
  movedToProfileId: null,
  id: 1,
  ...overrides,
});

/**
 * Creates a regular user without organization membership
 */
const createRegularUser = (overrides = {}) => ({
  ..._createUser(overrides),
  profile: {
    organization: null,
  },
});

/**
 * Creates a user that is a member of an organization
 */
const createOrgMemberUser = ({
  orgSlug,
  requestedSlug,
}: {
  orgSlug: string;
  requestedSlug: string | null;
}) => ({
  ..._createUser({
    profile: {
      organization: { slug: orgSlug, requestedSlug: requestedSlug },
    },
  }),
});

const _createTeam = (overrides = {}) => ({
  parent: null,
  ...overrides,
});

/**
 * Creates a regular team without organization association
 */
const createRegularTeam = (overrides = {}) => _createTeam(overrides);

/**
 * Creates a sub-team that belongs to an organization
 */
const createSubTeam = (orgSlug: string, overrides = {}) =>
  _createTeam({
    parent: {
      slug: orgSlug,
    },
    ...overrides,
  });

describe("isAuthorizedToViewFormOnOrgDomain", () => {
  it("should allow viewing any form (user or team form) when not on org domain", () => {
    const result = isAuthorizedToViewFormOnOrgDomain({
      user: createRegularUser(),
      currentOrgDomain: null,
      team: createRegularTeam(),
    });
    expect(result).toBe(true);
  });

  it("should allow viewing org member's form when user belongs to the current org domain", () => {
    const result = isAuthorizedToViewFormOnOrgDomain({
      user: createOrgMemberUser({ orgSlug: "test-org", requestedSlug: null }),
      currentOrgDomain: "test-org",
    });
    expect(result).toBe(true);
  });

  it("should allow viewing sub-team form when the sub team belongs to the current org domain", () => {
    const result = isAuthorizedToViewFormOnOrgDomain({
      user: createRegularUser(),
      currentOrgDomain: "test-org",
      team: createSubTeam("test-org"),
    });
    expect(result).toBe(true);
  });

  it("should deny viewing form when on org domain but neither user nor sub team belongs to it", () => {
    const result = isAuthorizedToViewFormOnOrgDomain({
      user: createOrgMemberUser("different-org"),
      currentOrgDomain: "test-org",
      team: createSubTeam("another-org"),
    });
    expect(result).toBe(false);
  });

  it("should handle undefined team parameter on org domain", () => {
    const result = isAuthorizedToViewFormOnOrgDomain({
      user: createRegularUser(),
      currentOrgDomain: "test-org",
      team: undefined,
    });
    expect(result).toBe(false);
  });

  it("should allow access when user has pending org membership request", () => {
    const result = isAuthorizedToViewFormOnOrgDomain({
      user: createOrgMemberUser({ orgSlug: "test-org", requestedSlug: "test-org" }),
      currentOrgDomain: "test-org",
    });
    expect(result).toBe(true);
  });
});
