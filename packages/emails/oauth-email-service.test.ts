import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./templates/admin-oauth-client-notification", () => {
  const cls = vi.fn();
  cls.prototype.sendEmail = vi.fn(() => Promise.resolve());
  return { default: cls };
});

vi.mock("./templates/oauth-client-approved-notification", () => {
  const cls = vi.fn();
  cls.prototype.sendEmail = vi.fn(() => Promise.resolve());
  return { default: cls };
});

vi.mock("./templates/oauth-client-rejected-notification", () => {
  const cls = vi.fn();
  cls.prototype.sendEmail = vi.fn(() => Promise.resolve());
  return { default: cls };
});

import {
  sendAdminOAuthClientNotification,
  sendOAuthClientApprovedNotification,
  sendOAuthClientRejectedNotification,
} from "./oauth-email-service";
import AdminOAuthClientNotification from "./templates/admin-oauth-client-notification";
import OAuthClientApprovedEmail from "./templates/oauth-client-approved-notification";
import OAuthClientRejectedEmail from "./templates/oauth-client-rejected-notification";

describe("oauth-email-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendAdminOAuthClientNotification", () => {
    it("creates AdminOAuthClientNotification and sends it", async () => {
      const input = {
        t: vi.fn((key: string) => key),
        instanceAdmins: [{ email: "admin@t.com" }],
        oAuthClient: { name: "MyApp", logo: "", redirect_uris: [], permissions: 0 },
        ownerEmail: "owner@t.com",
      };
      await sendAdminOAuthClientNotification(input);
      expect(AdminOAuthClientNotification).toHaveBeenCalledWith(input);
      expect(AdminOAuthClientNotification.prototype.sendEmail).toHaveBeenCalled();
    });
  });

  describe("sendOAuthClientApprovedNotification", () => {
    it("creates OAuthClientApprovedEmail and sends it", async () => {
      const input = {
        t: vi.fn((key: string) => key),
        oAuthClient: { name: "MyApp", clientId: "abc123" },
        ownerEmail: "owner@t.com",
      };
      await sendOAuthClientApprovedNotification(input);
      expect(OAuthClientApprovedEmail).toHaveBeenCalledWith(input);
      expect(OAuthClientApprovedEmail.prototype.sendEmail).toHaveBeenCalled();
    });
  });

  describe("sendOAuthClientRejectedNotification", () => {
    it("creates OAuthClientRejectedEmail and sends it", async () => {
      const input = {
        t: vi.fn((key: string) => key),
        oAuthClient: { name: "MyApp", clientId: "abc123" },
        ownerEmail: "owner@t.com",
        reason: "Policy violation",
      };
      await sendOAuthClientRejectedNotification(input);
      expect(OAuthClientRejectedEmail).toHaveBeenCalledWith(input);
      expect(OAuthClientRejectedEmail.prototype.sendEmail).toHaveBeenCalled();
    });
  });
});
