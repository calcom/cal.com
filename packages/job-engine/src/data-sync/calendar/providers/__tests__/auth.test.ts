import { describe, expect, it } from "vitest";

import { getGoogleAuth, getOutlookAuth } from "../auth";
import { AuthExpiredError, type CredentialLike } from "../types";

describe("provider auth token parsers", () => {
  it("parses Google auth tokens from credential.key root payload", () => {
    const credential: CredentialLike = {
      id: 1,
      type: "google_calendar",
      key: {
        access_token: "google-access",
        refresh_token: "google-refresh",
        expiryDate: 1735689600000,
        id_token: "google-id-token",
        token_type: "Bearer",
        scope: "calendar.readonly",
      },
    };

    const auth = getGoogleAuth(credential);

    expect(auth.accessToken).toBe("google-access");
    expect(auth.refreshToken).toBe("google-refresh");
    expect(auth.expiryDate).toBe(1735689600000);
    expect(auth.idToken).toBe("google-id-token");
    expect(auth.tokenType).toBe("Bearer");
  });

  it("parses Outlook auth tokens from nested credential.key.oauth payload", () => {
    const credential: CredentialLike = {
      id: 2,
      type: "office365_calendar",
      key: {
        oauth: {
          accessToken: "outlook-access",
          refreshToken: "outlook-refresh",
          expires_at: 1735689600,
          tokenType: "Bearer",
        },
      },
    };

    const auth = getOutlookAuth(credential);

    expect(auth.accessToken).toBe("outlook-access");
    expect(auth.refreshToken).toBe("outlook-refresh");
    expect(auth.expiryDate).toBe(1735689600);
    expect(auth.tokenType).toBe("Bearer");
  });

  it("throws AuthExpiredError when access token is missing", () => {
    const credential: CredentialLike = {
      id: 3,
      type: "google_calendar",
      key: {
        refresh_token: "only-refresh-token",
      },
    };

    expect(() => getGoogleAuth(credential)).toThrow(AuthExpiredError);
  });
});
