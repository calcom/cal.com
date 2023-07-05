import { describe, it, vi, expect } from "vitest";
import { isOrganisationAdmin } from "@calcom/lib/server/queries/organisations";
import { checkPermissions, getTeamOrThrow } from "./utils";
import { MembershipRole } from "@calcom/prisma/enums";
import { isTeamAdmin } from "@calcom/lib/server/queries";
import prismaMock from "../../../../../../../tests/libs/__mocks__/prisma"

vi.mock("@calcom/lib/server/queries", () => {
  return {
    isTeamAdmin: vi.fn(),
  };
});

vi.mock("@calcom/lib/server/queries/organisations", () => {
  return {
    isOrganisationAdmin: vi.fn(),
  };
});

const mockedReturnSuccessCheckPerms = { accepted: true, disableImpersonation: false, id: 1, role: MembershipRole.ADMIN, userId: 1, teamId: 1 }
const mockedReturnTeam = {
  id: 2,
  name: 'Brydon',
  slug: 'sean',
  logo: null,
  appLogo: null,
  appIconLogo: null,
  bio: null,
  hideBranding: false,
  hideBookATeamMember: false,
  createdAt: new Date(),
  metadata: { isOrganization: true },
  theme: null,
  brandColor: '#292929',
  darkBrandColor: '#fafafa',
  parentId: null,
  timeFormat: null,
  timeZone: 'Europe/London',
  weekStart: 'Sunday',
  parent: null
  }

describe("Invite Member Utils", () => {
  describe("checkPermissions", () => {
    it("It should throw an error if the user is not an admin of the ORG", async () => {
      vi.mocked(isOrganisationAdmin).mockResolvedValue(false);
      await expect(checkPermissions({ userId: 1, teamId: 1, isOrg: true })).rejects.toThrow();
    })
    it("It should NOT throw an error if the user is an admin of the ORG", async () => {
      vi.mocked(isOrganisationAdmin).mockResolvedValue(mockedReturnSuccessCheckPerms);
      await expect(checkPermissions({ userId: 1, teamId: 1, isOrg: true })).resolves.not.toThrow();
    })
    it("It should throw an error if the user is not an admin of the team", async () => {
      vi.mocked(isTeamAdmin).mockResolvedValue(false);
      await expect(checkPermissions({ userId: 1, teamId: 1 })).rejects.toThrow();
    })
    it("It should NOT throw an error if the user is an admin of a team", async () => {
      vi.mocked(isTeamAdmin).mockResolvedValue(mockedReturnSuccessCheckPerms);
      await expect(checkPermissions({ userId: 1, teamId: 1 })).resolves.not.toThrow();
    })
  })
  describe("getTeamOrThrow", () => {
    it("It should throw an error if the team is not found", async () => {
      prismaMock.team.findFirst.mockResolvedValue(null);
      await expect(getTeamOrThrow(1)).rejects.toThrow();
    })
    it("It should NOT throw an error if the team is found", async () => {
      prismaMock.team.findFirst.mockResolvedValue(mockedReturnTeam)
      await expect(getTeamOrThrow(1)).resolves.toEqual(mockedReturnTeam);
    })
  })
})