import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./templates/team-invite-email", () => {
  const cls = vi.fn();
  cls.prototype.sendEmail = vi.fn(() => Promise.resolve());
  return { default: cls };
});

vi.mock("./templates/organization-creation-email", () => {
  const cls = vi.fn();
  cls.prototype.sendEmail = vi.fn(() => Promise.resolve());
  return { default: cls };
});

vi.mock("./templates/organization-admin-no-slots-email", () => {
  const cls = vi.fn();
  cls.prototype.sendEmail = vi.fn(() => Promise.resolve());
  return { default: cls };
});

vi.mock("./templates/organization-email-verification", () => {
  const cls = vi.fn();
  cls.prototype.sendEmail = vi.fn(() => Promise.resolve());
  return { default: cls };
});

vi.mock("./templates/admin-organization-notification", () => {
  const cls = vi.fn();
  cls.prototype.sendEmail = vi.fn(() => Promise.resolve());
  return { default: cls };
});

import {
  sendAdminOrganizationNotification,
  sendOrganizationAdminNoSlotsNotification,
  sendOrganizationCreationEmail,
  sendOrganizationEmailVerification,
  sendTeamInviteEmail,
} from "./organization-email-service";
import AdminOrganizationNotification from "./templates/admin-organization-notification";
import OrganizationAdminNoSlotsEmail from "./templates/organization-admin-no-slots-email";
import OrganizationCreationEmail from "./templates/organization-creation-email";
import OrganizationEmailVerification from "./templates/organization-email-verification";
import TeamInviteEmail from "./templates/team-invite-email";

describe("organization-email-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendTeamInviteEmail", () => {
    it("creates TeamInviteEmail and sends it", async () => {
      const input = {
        to: "invitee@t.com",
        language: vi.fn(),
        from: "admin@t.com",
        teamName: "Team",
        joinLink: "https://cal.com/teams/invite/abc",
        isCalcom: true,
        isOrg: false,
        isAutoJoin: false,
        isExistingUser: false,
        parentTeamName: null,
        isOrganizationAdminReviewingUser: false,
      };
      await sendTeamInviteEmail(input);
      expect(TeamInviteEmail).toHaveBeenCalledWith(input);
      expect(TeamInviteEmail.prototype.sendEmail).toHaveBeenCalled();
    });
  });

  describe("sendOrganizationCreationEmail", () => {
    it("creates OrganizationCreationEmail and sends it", async () => {
      const input = {
        language: vi.fn(),
        to: "admin@t.com",
        ownerNewUsername: "newuser",
        ownerOldUsername: "olduser",
        orgName: "Org",
        orgSlug: "org",
        prevLink: "https://cal.com/old",
        newLink: "https://org.cal.com/new",
      };
      await sendOrganizationCreationEmail(input);
      expect(OrganizationCreationEmail).toHaveBeenCalledWith(input);
      expect(OrganizationCreationEmail.prototype.sendEmail).toHaveBeenCalled();
    });
  });

  describe("sendOrganizationAdminNoSlotsNotification", () => {
    it("creates OrganizationAdminNoSlotsEmail and sends it", async () => {
      const input = {
        language: vi.fn(),
        to: { email: "admin@t.com" },
        user: "testuser",
        slug: "meeting",
        startTime: "2024-01-01",
        endTime: "2024-01-31",
        teamSlug: "team",
        editLink: "https://cal.com/settings",
      };
      await sendOrganizationAdminNoSlotsNotification(input);
      expect(OrganizationAdminNoSlotsEmail).toHaveBeenCalledWith(input);
      expect(OrganizationAdminNoSlotsEmail.prototype.sendEmail).toHaveBeenCalled();
    });
  });

  describe("sendOrganizationEmailVerification", () => {
    it("creates OrganizationEmailVerification and sends it", async () => {
      const input = {
        language: vi.fn(),
        user: { email: "org@t.com" },
        code: "123456",
      };
      await sendOrganizationEmailVerification(input);
      expect(OrganizationEmailVerification).toHaveBeenCalledWith(input);
      expect(OrganizationEmailVerification.prototype.sendEmail).toHaveBeenCalled();
    });
  });

  describe("sendAdminOrganizationNotification", () => {
    it("creates AdminOrganizationNotification and sends it", async () => {
      const input = {
        t: vi.fn(),
        instanceAdmins: [{ email: "admin@t.com" }],
        ownerEmail: "owner@t.com",
        orgSlug: "org",
        webappIPAddress: "1.2.3.4",
      };
      await sendAdminOrganizationNotification(input);
      expect(AdminOrganizationNotification).toHaveBeenCalledWith(input);
      expect(AdminOrganizationNotification.prototype.sendEmail).toHaveBeenCalled();
    });
  });
});
