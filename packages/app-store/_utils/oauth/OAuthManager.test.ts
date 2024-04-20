// import prismaMock from "../../../../tests/libs/__mocks__/prismaMock";
import { afterEach, expect, test, vi, describe } from "vitest";
import "vitest-fetch-mock";

import { OAuthManager, TokenStatus } from "./OAuthManager";

afterEach(() => {
  vi.resetAllMocks();
});

const credentialSyncVariables = {
  APP_CREDENTIAL_SHARING_ENABLED: false,
  CREDENTIAL_SYNC_SECRET: "SECRET",
  CREDENTIAL_SYNC_SECRET_HEADER_NAME: "calcom-credential-sync-secret",
  CREDENTIAL_SYNC_ENDPOINT: "https://example.com/getToken",
};

function getDummyTokenObject(token: { refresh_token?: string; expiry_date?: number } | null = null) {
  return {
    access_token: "ACCESS_TOKEN",
    ...token,
  };
}

function generateJsonResponse({
  json,
  status = 200,
  statusText = "OK",
}: {
  json: unknown;
  status?: number;
  statusText?: string;
}) {
  return new Response(JSON.stringify(json), {
    status,
    statusText,
  });
}

describe("OAuthManager", () => {
  describe("Credential Sync Disabled", () => {
    const useCredentialSyncVariables = credentialSyncVariables;
    describe("API: `getTokenObjectOrFetch`", () => {
      describe("fetchNewTokenObject gets called with refresh_token", async () => {
        test('It would be null if "refresh_token" is not present in the currentTokenObject', async () => {
          const userId = 1;
          const invalidateTokenObject = vi.fn();
          const expireAccessToken = vi.fn();
          const fetchNewTokenObject = vi
            .fn()
            .mockResolvedValue(generateJsonResponse({ json: getDummyTokenObject() }));

          const auth = new OAuthManager({
            credentialSyncVariables: useCredentialSyncVariables,
            resourceOwner: {
              type: "user",
              id: userId,
            },
            appSlug: "demo-app",
            currentTokenObject: getDummyTokenObject(),
            fetchNewTokenObject,
            isTokenObjectUnusable: async () => {
              return null;
            },
            isAccessTokenUnusable: async () => {
              return null;
            },
            invalidateTokenObject: invalidateTokenObject,
            updateTokenObject: vi.fn(),
            expireAccessToken: expireAccessToken,
          });

          await auth.getTokenObjectOrFetch();
          expect(fetchNewTokenObject).toHaveBeenCalledWith({ refreshToken: null });
        });

        test('It would be the value if "refresh_token" is present in the currentTokenObject', async () => {
          const userId = 1;
          const invalidateTokenObject = vi.fn();
          const expireAccessToken = vi.fn();
          const fetchNewTokenObject = vi
            .fn()
            .mockResolvedValue(generateJsonResponse({ json: getDummyTokenObject() }));

          const auth1 = new OAuthManager({
            credentialSyncVariables: useCredentialSyncVariables,
            resourceOwner: {
              type: "user",
              id: userId,
            },
            appSlug: "demo-app",
            currentTokenObject: getDummyTokenObject({
              refresh_token: "REFRESH_TOKEN",
            }),
            fetchNewTokenObject,
            isTokenObjectUnusable: async () => {
              return null;
            },
            isAccessTokenUnusable: async () => {
              return null;
            },
            invalidateTokenObject: invalidateTokenObject,
            updateTokenObject: vi.fn(),
            expireAccessToken: expireAccessToken,
          });
          await auth1.getTokenObjectOrFetch();
          expect(fetchNewTokenObject).toHaveBeenCalledWith({ refreshToken: "REFRESH_TOKEN" });
        });
      });

      describe("expiry_date based token refresh", () => {
        test("fetchNewTokenObject is not called if token has not expired", async () => {
          const userId = 1;
          const invalidateTokenObject = vi.fn();
          const expireAccessToken = vi.fn();
          const fetchNewTokenObject = vi
            .fn()
            .mockResolvedValue(generateJsonResponse({ json: getDummyTokenObject() }));

          const auth1 = new OAuthManager({
            credentialSyncVariables: useCredentialSyncVariables,
            resourceOwner: {
              type: "user",
              id: userId,
            },
            appSlug: "demo-app",
            currentTokenObject: getDummyTokenObject({
              refresh_token: "REFRESH_TOKEN",
              expiry_date: Date.now() + 10 * 1000,
            }),
            fetchNewTokenObject,
            isTokenObjectUnusable: async () => {
              return null;
            },
            isAccessTokenUnusable: async () => {
              return null;
            },
            invalidateTokenObject: invalidateTokenObject,
            updateTokenObject: vi.fn(),
            expireAccessToken: expireAccessToken,
          });
          await auth1.getTokenObjectOrFetch();
          expect(fetchNewTokenObject).not.toHaveBeenCalled();
        });

        test("fetchNewTokenObject is called if token has expired", async () => {
          const userId = 1;
          const invalidateTokenObject = vi.fn();
          const expireAccessToken = vi.fn();
          const fetchNewTokenObject = vi
            .fn()
            .mockResolvedValue(generateJsonResponse({ json: getDummyTokenObject() }));

          const auth1 = new OAuthManager({
            credentialSyncVariables: useCredentialSyncVariables,
            resourceOwner: {
              type: "user",
              id: userId,
            },
            appSlug: "demo-app",
            currentTokenObject: getDummyTokenObject({
              refresh_token: "REFRESH_TOKEN",
              expiry_date: Date.now() - 10 * 1000,
            }),
            fetchNewTokenObject,
            isTokenObjectUnusable: async () => {
              return null;
            },
            isAccessTokenUnusable: async () => {
              return null;
            },
            invalidateTokenObject: invalidateTokenObject,
            updateTokenObject: vi.fn(),
            expireAccessToken: expireAccessToken,
          });
          await auth1.getTokenObjectOrFetch();
          expect(fetchNewTokenObject).toHaveBeenCalledWith({ refreshToken: "REFRESH_TOKEN" });
        });
      });

      test("If fetchNewTokenObject returns null then auth.getTokenObjectOrFetch would throw error", async () => {
        const userId = 1;
        const invalidateTokenObject = vi.fn();
        const expireAccessToken = vi.fn();

        const auth = new OAuthManager({
          credentialSyncVariables: useCredentialSyncVariables,
          resourceOwner: {
            type: "user",
            id: userId,
          },
          appSlug: "demo-app",
          currentTokenObject: getDummyTokenObject(),
          fetchNewTokenObject: async () => {
            return null;
          },
          isTokenObjectUnusable: async () => {
            return null;
          },
          isAccessTokenUnusable: async () => {
            return null;
          },
          invalidateTokenObject: invalidateTokenObject,
          updateTokenObject: vi.fn(),
          expireAccessToken: expireAccessToken,
        });

        expect(async () => {
          return auth.getTokenObjectOrFetch();
        }).rejects.toThrowError("could not refresh the token");
      });

      test("if fetchNewTokenObject throws error that's not handled by isTokenObjectUnusable and isAccessTokenUnusable then auth.getTokenObjectOrFetch would still not throw error", async () => {
        const userId = 1;
        const invalidateTokenObject = vi.fn();
        const expireAccessToken = vi.fn();

        const auth = new OAuthManager({
          credentialSyncVariables: useCredentialSyncVariables,
          resourceOwner: {
            type: "user",
            id: userId,
          },
          appSlug: "demo-app",
          currentTokenObject: getDummyTokenObject(),
          fetchNewTokenObject: async () => {
            throw new Error("testError");
          },
          isTokenObjectUnusable: async () => {
            return null;
          },
          isAccessTokenUnusable: async () => {
            return null;
          },
          invalidateTokenObject: invalidateTokenObject,
          updateTokenObject: vi.fn(),
          expireAccessToken: expireAccessToken,
        });

        expect(async () => {
          return auth.getTokenObjectOrFetch();
        }).rejects.toThrowError("Internal Server Error");
      });

      test("if fetchNewTokenObject throws error that's handled by isTokenObjectUnusable then auth.getTokenObjectOrFetch would still throw error but a different one as access_token won't be available", async () => {
        const userId = 1;
        const invalidateTokenObject = vi.fn();
        const expireAccessToken = vi.fn();

        const auth = new OAuthManager({
          credentialSyncVariables: useCredentialSyncVariables,
          resourceOwner: {
            type: "user",
            id: userId,
          },
          appSlug: "demo-app",
          currentTokenObject: getDummyTokenObject(),
          fetchNewTokenObject: async () => {
            throw new Error("testError");
          },
          isTokenObjectUnusable: async () => {
            return {
              reason: "some reason",
            };
          },
          isAccessTokenUnusable: async () => {
            return null;
          },
          invalidateTokenObject: invalidateTokenObject,
          updateTokenObject: vi.fn(),
          expireAccessToken: expireAccessToken,
        });

        expect(async () => {
          return auth.getTokenObjectOrFetch();
        }).rejects.toThrowError("Invalid token response");
      });
    });

    describe("API: `request`", () => {
      test("It would call fetch by adding Authorization header automatically", async () => {
        const userId = 1;
        const invalidateTokenObject = vi.fn();
        const expireAccessToken = vi.fn();
        const fetchNewTokenObject = vi
          .fn()
          .mockResolvedValue(generateJsonResponse({ json: getDummyTokenObject() }));

        const auth = new OAuthManager({
          credentialSyncVariables: useCredentialSyncVariables,
          resourceOwner: {
            type: "user",
            id: userId,
          },
          appSlug: "demo-app",
          currentTokenObject: getDummyTokenObject(),
          fetchNewTokenObject,
          isTokenObjectUnusable: async () => {
            return null;
          },
          isAccessTokenUnusable: async () => {
            return null;
          },
          invalidateTokenObject: invalidateTokenObject,
          updateTokenObject: vi.fn(),
          expireAccessToken: expireAccessToken,
        });

        fetchMock.mockReturnValueOnce(Promise.resolve(generateJsonResponse({ json: { key: "value" } })));
        const response = await auth.request({
          url: "https://example.com",
          options: {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              key: "value",
            }),
          },
        });

        expect(response).toEqual({ tokenStatus: TokenStatus.VALID, json: { key: "value" } });
        const fetchCallArguments = fetchMock.mock.calls[0];
        expect(fetchCallArguments[0]).toBe("https://example.com");
        // Verify that Authorization header is added automatically
        // Along with other passed headers and other options
        expect(fetchCallArguments[1]).toEqual(
          expect.objectContaining({
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer ACCESS_TOKEN",
            },
            body: JSON.stringify({
              key: "value",
            }),
          })
        );
      });

      test("If `isTokenObjectUnusable` marks the response invalid, then `invalidateTokenObject` function is called", async () => {
        const userId = 1;
        const invalidateTokenObject = vi.fn();
        const expireAccessToken = vi.fn();

        const fetchNewTokenObject = vi
          .fn()
          .mockResolvedValue(generateJsonResponse({ json: getDummyTokenObject() }));

        const fakedFetchJsonResult = { key: "value" };
        const fakedFetchResponse = generateJsonResponse({ json: fakedFetchJsonResult });

        const auth = new OAuthManager({
          autoCheckTokenExpiryOnRequest: false,
          credentialSyncVariables: useCredentialSyncVariables,
          resourceOwner: {
            type: "user",
            id: userId,
          },
          appSlug: "demo-app",
          currentTokenObject: getDummyTokenObject(),
          fetchNewTokenObject,
          isTokenObjectUnusable: async (response) => {
            const jsonRes = await response.json();
            expect(jsonRes).toEqual(fakedFetchJsonResult);
            return {
              reason: "some reason",
            };
          },
          isAccessTokenUnusable: async () => {
            return null;
          },
          invalidateTokenObject: invalidateTokenObject,
          updateTokenObject: vi.fn(),
          expireAccessToken: expireAccessToken,
        });

        fetchMock.mockReturnValueOnce(Promise.resolve(fakedFetchResponse));
        const response = await auth.request({
          url: "https://example.com",
          options: {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              key: "value",
            }),
          },
        });

        expect(response).toEqual({
          tokenStatus: TokenStatus.UNUSABLE_TOKEN_OBJECT,
          json: fakedFetchJsonResult,
        });
        expect(invalidateTokenObject).toHaveBeenCalled();
        expect(expireAccessToken).not.toHaveBeenCalled();
      });

      test("If `isAccessTokenUnusable` marks the response invalid, then `expireAccessToken` function is called", async () => {
        const userId = 1;
        const invalidateTokenObject = vi.fn();
        const expireAccessToken = vi.fn();

        const fetchNewTokenObject = vi
          .fn()
          .mockResolvedValue(generateJsonResponse({ json: getDummyTokenObject() }));

        const fakedFetchJsonResult = { key: "value" };
        const fakedFetchResponse = generateJsonResponse({ json: fakedFetchJsonResult });

        const auth = new OAuthManager({
          autoCheckTokenExpiryOnRequest: false,
          credentialSyncVariables: useCredentialSyncVariables,
          resourceOwner: {
            type: "user",
            id: userId,
          },
          appSlug: "demo-app",
          currentTokenObject: getDummyTokenObject(),
          fetchNewTokenObject,
          isTokenObjectUnusable: async () => {
            return null;
          },
          isAccessTokenUnusable: async (response) => {
            const jsonRes = await response.json();
            expect(jsonRes).toEqual(fakedFetchJsonResult);
            return {
              reason: "some reason",
            };
          },
          invalidateTokenObject: invalidateTokenObject,
          updateTokenObject: vi.fn(),
          expireAccessToken: expireAccessToken,
        });

        fetchMock.mockReturnValueOnce(Promise.resolve(fakedFetchResponse));
        const response = await auth.request({
          url: "https://example.com",
          options: {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              key: "value",
            }),
          },
        });

        expect(response).toEqual({
          tokenStatus: TokenStatus.UNUSABLE_ACCESS_TOKEN,
          json: fakedFetchJsonResult,
        });

        expect(invalidateTokenObject).not.toHaveBeenCalled();
        expect(expireAccessToken).toHaveBeenCalled();
      });

      test("If status is 204 make the json null because empty string which is usually the case with 204 status is not a valid json", async () => {
        const userId = 1;
        const invalidateTokenObject = vi.fn();
        const expireAccessToken = vi.fn();

        const fetchNewTokenObject = vi
          .fn()
          .mockResolvedValue(generateJsonResponse({ json: getDummyTokenObject() }));

        const fakedFetchJsonResult = { key: "value" };
        const fakedFetchResponse = generateJsonResponse({ json: fakedFetchJsonResult, status: 204 });

        const auth = new OAuthManager({
          credentialSyncVariables: useCredentialSyncVariables,
          resourceOwner: {
            type: "user",
            id: userId,
          },
          appSlug: "demo-app",
          currentTokenObject: getDummyTokenObject(),
          fetchNewTokenObject,
          isTokenObjectUnusable: async () => {
            return null;
          },
          isAccessTokenUnusable: async () => {
            return null;
          },
          invalidateTokenObject: invalidateTokenObject,
          updateTokenObject: vi.fn(),
          expireAccessToken: expireAccessToken,
        });

        fetchMock.mockReturnValueOnce(Promise.resolve(fakedFetchResponse));
        const response = await auth.request({
          url: "https://example.com",
          options: {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              key: "value",
            }),
          },
        });

        expect(response).toEqual({ tokenStatus: TokenStatus.VALID, json: null });
        expect(expireAccessToken).not.toHaveBeenCalled();
      });

      test("If status is not okay it throws error with statusText", async () => {
        const userId = 1;
        const invalidateTokenObject = vi.fn();
        const expireAccessToken = vi.fn();

        const fetchNewTokenObject = vi
          .fn()
          .mockResolvedValue(generateJsonResponse({ json: getDummyTokenObject() }));

        const fakedFetchJsonResult = { key: "value" };
        const fakedFetchResponse = generateJsonResponse({
          json: fakedFetchJsonResult,
          status: 500,
          statusText: "Internal Server Error",
        });

        const auth = new OAuthManager({
          credentialSyncVariables: useCredentialSyncVariables,
          resourceOwner: {
            type: "user",
            id: userId,
          },
          appSlug: "demo-app",
          currentTokenObject: getDummyTokenObject(),
          fetchNewTokenObject,
          isTokenObjectUnusable: async () => {
            return null;
          },
          isAccessTokenUnusable: async () => {
            return null;
          },
          invalidateTokenObject: invalidateTokenObject,
          updateTokenObject: vi.fn(),
          expireAccessToken: expireAccessToken,
        });

        fetchMock.mockReturnValueOnce(Promise.resolve(fakedFetchResponse));
        expect(async () =>
          auth.request({
            url: "https://example.com",
            options: {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                key: "value",
              }),
            },
          })
        ).rejects.toThrowError("Internal Server Error");
      });

      test("if `customFetch` throws error that's handled by isTokenObjectUnusable then auth.getTokenObjectOrFetch would not throw error", async () => {
        const userId = 1;
        const invalidateTokenObject = vi.fn();
        const expireAccessToken = vi.fn();
        const fetchNewTokenObject = vi
          .fn()
          .mockResolvedValue(generateJsonResponse({ json: getDummyTokenObject() }));

        const auth = new OAuthManager({
          credentialSyncVariables: useCredentialSyncVariables,
          resourceOwner: {
            type: "user",
            id: userId,
          },
          appSlug: "demo-app",
          currentTokenObject: getDummyTokenObject(),
          fetchNewTokenObject,
          isTokenObjectUnusable: async () => {
            return {
              reason: "some reason",
            };
          },
          isAccessTokenUnusable: async () => {
            return null;
          },
          invalidateTokenObject: invalidateTokenObject,
          updateTokenObject: vi.fn(),
          expireAccessToken: expireAccessToken,
        });

        await expect(
          auth.request(() => {
            throw new Error("Internal Server Error");
          })
        ).rejects.toThrowError("Internal Server Error");
      });
    });
  });

  describe("Credential Sync Enabled", () => {
    const useCredentialSyncVariables = {
      ...credentialSyncVariables,
      APP_CREDENTIAL_SHARING_ENABLED: true,
    };
    describe("API: `getTokenObjectOrFetch`", () => {
      test("CREDENTIAL_SYNC_ENDPOINT is hit(when no expiry_date is set) instead of calling fetchNewTokenObject", async () => {
        const userId = 1;
        const invalidateTokenObject = vi.fn();
        const expireAccessToken = vi.fn();
        const fetchNewTokenObject = vi
          .fn()
          .mockResolvedValue(generateJsonResponse({ json: getDummyTokenObject() }));

        const auth1 = new OAuthManager({
          credentialSyncVariables: useCredentialSyncVariables,
          resourceOwner: {
            type: "user",
            id: userId,
          },
          appSlug: "demo-app",
          currentTokenObject: getDummyTokenObject({
            refresh_token: "REFRESH_TOKEN",
          }),
          fetchNewTokenObject,
          isTokenObjectUnusable: async () => {
            return null;
          },
          isAccessTokenUnusable: async () => {
            return null;
          },
          invalidateTokenObject: invalidateTokenObject,
          updateTokenObject: vi.fn(),
          expireAccessToken: expireAccessToken,
        });

        const fakedFetchResponse = generateJsonResponse({ json: getDummyTokenObject() });
        fetchMock.mockReturnValueOnce(Promise.resolve(fakedFetchResponse));

        await auth1.getTokenObjectOrFetch();
        expectToBeTokenGetCall({
          fetchCall: fetchMock.mock.calls[0],
          useCredentialSyncVariables,
          userId,
          appSlug: "demo-app",
        });
        expect(fetchNewTokenObject).not.toHaveBeenCalled();
      });

      describe("expiry_date based token refresh", () => {
        test("CREDENTIAL_SYNC_ENDPOINT is not hit if token has not expired", async () => {
          const userId = 1;
          const invalidateTokenObject = vi.fn();
          const expireAccessToken = vi.fn();
          const fetchNewTokenObject = vi
            .fn()
            .mockResolvedValue(generateJsonResponse({ json: getDummyTokenObject() }));

          const auth1 = new OAuthManager({
            credentialSyncVariables: useCredentialSyncVariables,
            resourceOwner: {
              type: "user",
              id: userId,
            },
            appSlug: "demo-app",
            currentTokenObject: getDummyTokenObject({
              refresh_token: "REFRESH_TOKEN",
              expiry_date: Date.now() + 10 * 1000,
            }),
            fetchNewTokenObject,
            isTokenObjectUnusable: async () => {
              return null;
            },
            isAccessTokenUnusable: async () => {
              return null;
            },
            invalidateTokenObject: invalidateTokenObject,
            updateTokenObject: vi.fn(),
            expireAccessToken: expireAccessToken,
          });

          await auth1.getTokenObjectOrFetch();
          expect(fetchNewTokenObject).not.toHaveBeenCalled();
          expect(fetchMock).not.toHaveBeenCalled();
        });

        test("CREDENTIAL_SYNC_ENDPOINT is hit if token has expired", async () => {
          const userId = 1;
          const invalidateTokenObject = vi.fn();
          const expireAccessToken = vi.fn();
          const fetchNewTokenObject = vi
            .fn()
            .mockResolvedValue(generateJsonResponse({ json: getDummyTokenObject() }));

          const auth1 = new OAuthManager({
            credentialSyncVariables: useCredentialSyncVariables,
            resourceOwner: {
              type: "user",
              id: userId,
            },
            appSlug: "demo-app",
            currentTokenObject: getDummyTokenObject({
              refresh_token: "REFRESH_TOKEN",
              expiry_date: Date.now() - 10 * 1000,
            }),
            fetchNewTokenObject,
            isTokenObjectUnusable: async () => {
              return null;
            },
            isAccessTokenUnusable: async () => {
              return null;
            },
            invalidateTokenObject: invalidateTokenObject,
            updateTokenObject: vi.fn(),
            expireAccessToken: expireAccessToken,
          });
          const fakedFetchResponse = generateJsonResponse({ json: getDummyTokenObject() });
          fetchMock.mockReturnValueOnce(Promise.resolve(fakedFetchResponse));

          await auth1.getTokenObjectOrFetch();
          expectToBeTokenGetCall({
            fetchCall: fetchMock.mock.calls[0],
            useCredentialSyncVariables,
            userId,
            appSlug: "demo-app",
          });
          expect(fetchNewTokenObject).not.toHaveBeenCalled();
        });
      });
    });

    describe("API: `request`", () => {
      test("If `isTokenObjectUnusable` marks the response invalid, then `invalidateTokenObject` function is called", async () => {
        const userId = 1;
        const invalidateTokenObject = vi.fn();
        const expireAccessToken = vi.fn();

        const fetchNewTokenObject = vi.fn();
        const fakedFetchJsonResult = { key: "value" };
        const fakedFetchResponse = generateJsonResponse({ json: fakedFetchJsonResult });

        const auth = new OAuthManager({
          credentialSyncVariables: useCredentialSyncVariables,
          resourceOwner: {
            type: "user",
            id: userId,
          },
          appSlug: "demo-app",
          currentTokenObject: getDummyTokenObject({
            // To make sure that existing token is used and thus refresh token doesn't happen
            expiry_date: Date.now() + 10 * 1000,
          }),
          fetchNewTokenObject,
          isTokenObjectUnusable: async (response) => {
            const jsonRes = await response.json();
            expect(jsonRes).toEqual(fakedFetchJsonResult);
            return {
              reason: "some reason",
            };
          },
          isAccessTokenUnusable: async () => {
            return null;
          },
          invalidateTokenObject: invalidateTokenObject,
          updateTokenObject: vi.fn(),
          expireAccessToken: expireAccessToken,
        });

        // For fetch triggered by the actual request
        fetchMock.mockReturnValueOnce(Promise.resolve(fakedFetchResponse));

        const response = await auth.request({
          url: "https://example.com",
          options: {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              key: "value",
            }),
          },
        });

        expect(response).toEqual({
          tokenStatus: TokenStatus.UNUSABLE_TOKEN_OBJECT,
          json: fakedFetchJsonResult,
        });
        expect(invalidateTokenObject).not.toHaveBeenCalled();
        expect(expireAccessToken).toHaveBeenCalled();
      });
    });
  });
});

function expectToBeTokenGetCall({
  fetchCall,
  useCredentialSyncVariables,
  userId,
  appSlug,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetchCall: any[];
  useCredentialSyncVariables: {
    APP_CREDENTIAL_SHARING_ENABLED: boolean;
    CREDENTIAL_SYNC_SECRET: string;
    CREDENTIAL_SYNC_SECRET_HEADER_NAME: string;
    CREDENTIAL_SYNC_ENDPOINT: string;
  };
  userId: number;
  appSlug: string;
}) {
  expect(fetchCall[0]).toBe("https://example.com/getToken");
  expect(fetchCall[1]).toEqual(
    expect.objectContaining({
      method: "POST",
      headers: {
        [useCredentialSyncVariables.CREDENTIAL_SYNC_SECRET_HEADER_NAME]:
          useCredentialSyncVariables.CREDENTIAL_SYNC_SECRET,
      },
    })
  );

  const fetchBody = fetchCall[1]?.body as unknown as URLSearchParams;
  expect(fetchBody.get("calcomUserId")).toBe(userId.toString());
  expect(fetchBody.get("appSlug")).toBe(appSlug);
}
