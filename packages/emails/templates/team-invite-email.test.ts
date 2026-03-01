import type { TFunction } from "i18next";
import { describe, expect, it, vi } from "vitest";
import TeamInviteEmail from "./team-invite-email";

class TestTeamInviteEmail extends TeamInviteEmail {
  public async getPayload() {
    return await this.getNodeMailerPayload();
  }
}

vi.mock("../src/renderEmail", () => ({
  default: vi.fn(() => Promise.resolve("<html>team-invite</html>")),
}));

vi.mock("@calcom/lib/constants", () => ({
  EMAIL_FROM_NAME: "Cal.com",
  IS_CALCOM: true,
  WEBAPP_URL: "https://app.cal.com",
}));

vi.mock("../lib/utils/team-invite-utils", () => ({
  getSubject: vi.fn(() => "Team Invite Subject"),
  getTypeOfInvite: vi.fn(() => "team"),
}));

vi.mock("./_base-email", () => ({
  default: class {
    getMailerOptions() {
      return { from: "noreply@cal.com" };
    }
  },
}));

const mockT = vi.fn((key: string) => key) as unknown as TFunction;

const createInvite = () => ({
  to: "invitee@test.com",
  language: mockT,
  from: "admin@test.com",
  teamName: "Team A",
  joinLink: "https://app.cal.com/teams/invite/abc",
  isCalcom: true,
  isOrg: false,
  isAutoJoin: false,
  isExistingUser: false,
  parentTeamName: null,
  isOrganizationAdminReviewingUser: false,
});

describe("TeamInviteEmail", () => {
  it("sets name to SEND_TEAM_INVITE_EMAIL", () => {
    const email = new TestTeamInviteEmail(createInvite());
    expect(email.name).toBe("SEND_TEAM_INVITE_EMAIL");
  });

  it("stores teamInviteEvent", () => {
    const invite = createInvite();
    const email = new TestTeamInviteEmail(invite);
    expect(email.teamInviteEvent).toEqual(invite);
  });

  describe("getNodeMailerPayload", () => {
    it("sends to invitee email", async () => {
      const email = new TestTeamInviteEmail(createInvite());
      const payload = await email.getPayload();
      expect(payload.to).toBe("invitee@test.com");
    });

    it("uses getSubject for subject line", async () => {
      const email = new TestTeamInviteEmail(createInvite());
      const payload = await email.getPayload();
      expect(payload.subject).toBe("Team Invite Subject");
    });

    it("includes html content", async () => {
      const email = new TestTeamInviteEmail(createInvite());
      const payload = await email.getPayload();
      expect(payload.html).toBe("<html>team-invite</html>");
    });

    it("returns empty text", async () => {
      const email = new TestTeamInviteEmail(createInvite());
      const payload = await email.getPayload();
      expect(payload.text).toBe("");
    });

    it("uses EMAIL_FROM_NAME for from", async () => {
      const email = new TestTeamInviteEmail(createInvite());
      const payload = await email.getPayload();
      expect(payload.from).toBe("Cal.com <noreply@cal.com>");
    });
  });
});
