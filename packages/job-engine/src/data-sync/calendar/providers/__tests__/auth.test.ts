import { afterEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@calcom/prisma";

import { getGoogleAuth, getGoogleAuthWithRefresh, getOutlookAuth } from "../auth";
import { AuthExpiredError, type CredentialLike } from "../types";

describe("provider auth token parsers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it("refreshes expired Google access token and persists updated credential key", async () => {
    const credential: CredentialLike = {
      id: 4,
      type: "google_calendar",
      key: {
        access_token: "expired-access",
        refresh_token: "google-refresh",
        expiry_date: Date.now() - 10_000,
      },
    };

    const appFindSpy = vi.spyOn(prisma.app, "findUnique").mockResolvedValue({
      keys: {
        client_id: "google-client-id",
        client_secret: "google-client-secret",
      },
    } as never);
    const credentialUpdateSpy = vi.spyOn(prisma.credential, "update").mockResolvedValue({} as never);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ access_token: "fresh-access", expires_in: 3600 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

    const auth = await getGoogleAuthWithRefresh(credential);

    expect(auth.accessToken).toBe("fresh-access");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(appFindSpy).toHaveBeenCalledTimes(1);
    expect(credentialUpdateSpy).toHaveBeenCalledTimes(1);
    expect((credential.key as Record<string, unknown>).access_token).toBe("fresh-access");
  });
});
