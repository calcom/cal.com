// import prismaMock from "../../../../tests/libs/__mocks__/prismaMock";
import { afterEach, expect, test, vi, describe } from "vitest";
import "vitest-fetch-mock";

import {
  generateJsonResponse,
  successResponse,
  internalServerErrorResponse,
  generateTextResponse,
} from "../testUtils";
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

function getDummyTokenObject(
  token: { refresh_token?: string; expiry_date?: number; expires_in?: number } | null = null
) {
  return {
    access_token: "ACCESS_TOKEN",
    ...token,
  };
}

function getExpiredTokenObject() {
  return getDummyTokenObject({
    // To make sure that existing token is used and thus refresh token doesn't happen
    expiry_date: Date.now() - 10 * 1000,
  });
}

describe("Credential Sync Disabled", () => {
  const useCredentialSyncVariables = credentialSyncVariables;
  describe("API: `getTokenObjectOrFetch`", () => {
    describe("`fetchNewTokenObject` gets called with refresh_token arg", async () => {
      test('refresh_token argument would be null if "refresh_token" is not present in the currentTokenObject', async () => {
        const userId = 1;
        const invalidateTokenObject = vi.fn();
        const expireAccessToken = vi.fn();
        const updateTokenObject = vi.fn();
        const fetchNewTokenObject = vi
          .fn()
          .mockResolvedValue(successResponse({ json: getDummyTokenObject() }));

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
          updateTokenObject: updateTokenObject,
          expireAccessToken: expireAccessToken,
        });

        await auth.getTokenObjectOrFetch();
        expect(fetchNewTokenObject).toHaveBeenCalledWith({ refreshToken: null });
      });

      test('refresh_token would be the value if "refresh_token" is present in the currentTokenObject', async () => {
        const userId = 1;
        const invalidateTokenObject = vi.fn();
        const expireAccessToken = vi.fn();
        const updateTokenObject = vi.fn();
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
          updateTokenObject: updateTokenObject,
          expireAccessToken: expireAccessToken,
        });
        await auth1.getTokenObjectOrFetch();
        expect(fetchNewTokenObject).toHaveBeenCalledWith({ refreshToken: "REFRESH_TOKEN" });
      });
    });

    describe("expiry_date based token refresh", () => {
      describe("checking using expiry_date", () => {
        test("fetchNewTokenObject is not called if token has not expired", async () => {
          const userId = 1;
          const invalidateTokenObject = vi.fn();
          const expireAccessToken = vi.fn();
          const updateTokenObject = vi.fn();
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
            updateTokenObject: updateTokenObject,
            expireAccessToken: expireAccessToken,
          });
          await auth1.getTokenObjectOrFetch();
          expect(fetchNewTokenObject).not.toHaveBeenCalled();
          expect(updateTokenObject).not.toHaveBeenCalled();
        });

        test("`fetchNewTokenObject` is called if token has expired. Also, `updateTokenObject` is called with currentTokenObject and newTokenObject merged", async () => {
          const userId = 1;
          const invalidateTokenObject = vi.fn();
          const expireAccessToken = vi.fn();
          const updateTokenObject = vi.fn();
          const currentTokenObject = getDummyTokenObject({
            refresh_token: "REFRESH_TOKEN",
            expiry_date: Date.now() - 10 * 1000,
          });
          const newTokenObjectInResponse = getDummyTokenObject();
          const fetchNewTokenObject = vi
            .fn()
            .mockResolvedValue(generateJsonResponse({ json: newTokenObjectInResponse }));

          const auth1 = new OAuthManager({
            credentialSyncVariables: useCredentialSyncVariables,
            resourceOwner: {
              type: "user",
              id: userId,
            },
            appSlug: "demo-app",
            currentTokenObject: currentTokenObject,
            fetchNewTokenObject,
            isTokenObjectUnusable: async () => {
              return null;
            },
            isAccessTokenUnusable: async () => {
              return null;
            },
            invalidateTokenObject: invalidateTokenObject,
            updateTokenObject: updateTokenObject,
            expireAccessToken: expireAccessToken,
          });
          await auth1.getTokenObjectOrFetch();
          expect(fetchNewTokenObject).toHaveBeenCalledWith({ refreshToken: "REFRESH_TOKEN" });
          expect(updateTokenObject).toHaveBeenCalledWith({
            ...currentTokenObject,
            ...newTokenObjectInResponse,
            // Consider the token as expired as newTokenObjectInResponse didn't have expiry
            expiry_date: 0,
          });
        });
      });

      describe("checking using expires_in", () => {
        // eslint-disable-next-line playwright/max-nested-describe
        describe("expires_in(relative to current time)", () => {
          test("fetchNewTokenObject is called if expires_in is 0", async () => {
            const userId = 1;
            const invalidateTokenObject = vi.fn();
            const expireAccessToken = vi.fn();
            const updateTokenObject = vi.fn();
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
                expires_in: 0,
              }),
              fetchNewTokenObject,
              isTokenObjectUnusable: async () => {
                return null;
              },
              isAccessTokenUnusable: async () => {
                return null;
              },
              invalidateTokenObject: invalidateTokenObject,
              updateTokenObject: updateTokenObject,
              expireAccessToken: expireAccessToken,
            });
            await auth1.getTokenObjectOrFetch();
            expect(fetchNewTokenObject).toHaveBeenCalledWith({ refreshToken: "REFRESH_TOKEN" });
          });

          test("`fetchNewTokenObject` is not called even if expires_in is any non zero positive value(that is not 'time since epoch')", async () => {
            const userId = 1;
            const invalidateTokenObject = vi.fn();
            const expireAccessToken = vi.fn();
            const updateTokenObject = vi.fn();
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
                expires_in: 5,
              }),
              fetchNewTokenObject,
              isTokenObjectUnusable: async () => {
                return null;
              },
              isAccessTokenUnusable: async () => {
                return null;
              },
              invalidateTokenObject: invalidateTokenObject,
              updateTokenObject: updateTokenObject,
              expireAccessToken: expireAccessToken,
            });
            await auth1.getTokenObjectOrFetch();
            expect(fetchNewTokenObject).toHaveBeenCalledWith({ refreshToken: "REFRESH_TOKEN" });
          });
        });

        // eslint-disable-next-line playwright/max-nested-describe
        describe("expires_in(relative to epoch time)", () => {
          test("fetchNewTokenObject is not called if token has not expired", async () => {
            const userId = 1;
            const invalidateTokenObject = vi.fn();
            const expireAccessToken = vi.fn();
            const updateTokenObject = vi.fn();
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
                expires_in: Date.now() / 1000 + 5,
              }),
              fetchNewTokenObject,
              isTokenObjectUnusable: async () => {
                return null;
              },
              isAccessTokenUnusable: async () => {
                return null;
              },
              invalidateTokenObject: invalidateTokenObject,
              updateTokenObject: updateTokenObject,
              expireAccessToken: expireAccessToken,
            });
            await auth1.getTokenObjectOrFetch();
            expect(fetchNewTokenObject).not.toHaveBeenCalledWith({ refreshToken: "REFRESH_TOKEN" });
          });

          test("fetchNewTokenObject is called if token has expired", async () => {
            const userId = 1;
            const invalidateTokenObject = vi.fn();
            const expireAccessToken = vi.fn();
            const updateTokenObject = vi.fn();
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
                expires_in: Date.now() / 1000 + 0,
              }),
              fetchNewTokenObject,
              isTokenObjectUnusable: async () => {
                return null;
              },
              isAccessTokenUnusable: async () => {
                return null;
              },
              invalidateTokenObject: invalidateTokenObject,
              updateTokenObject: updateTokenObject,
              expireAccessToken: expireAccessToken,
            });
            await auth1.getTokenObjectOrFetch();
            expect(fetchNewTokenObject).toHaveBeenCalledWith({ refreshToken: "REFRESH_TOKEN" });
          });
        });
      });
    });

    test("If fetchNewTokenObject returns null then auth.getTokenObjectOrFetch would throw error", async () => {
      const userId = 1;
      const invalidateTokenObject = vi.fn();
      const expireAccessToken = vi.fn();
      const updateTokenObject = vi.fn();

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
        updateTokenObject: updateTokenObject,
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
      const updateTokenObject = vi.fn();

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
        updateTokenObject: updateTokenObject,
        expireAccessToken: expireAccessToken,
      });

      expect(async () => {
        return auth.getTokenObjectOrFetch();
      }).rejects.toThrowError("Invalid token response");
    });

    test("if fetchNewTokenObject throws error that's handled by isTokenObjectUnusable then auth.getTokenObjectOrFetch would still throw error but a different one as access_token won't be available", async () => {
      const userId = 1;
      const invalidateTokenObject = vi.fn();
      const expireAccessToken = vi.fn();
      const updateTokenObject = vi.fn();

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
        updateTokenObject: updateTokenObject,
        expireAccessToken: expireAccessToken,
      });

      expect(async () => {
        return auth.getTokenObjectOrFetch();
      }).rejects.toThrowError("Invalid token response");
    });
  });

  describe("API: `request`", () => {
    test("It would call fetch by adding Authorization and content header automatically", async () => {
      const userId = 1;
      const invalidateTokenObject = vi.fn();
      const expireAccessToken = vi.fn();
      const updateTokenObject = vi.fn();
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
        updateTokenObject: updateTokenObject,
        expireAccessToken: expireAccessToken,
      });

      fetchMock.mockReturnValueOnce(Promise.resolve(generateJsonResponse({ json: { key: "value" } })));
      const response = await auth.request({
        url: "https://example.com",
        options: {
          method: "POST",
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
      const updateTokenObject = vi.fn();

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
        updateTokenObject: updateTokenObject,
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
      const updateTokenObject = vi.fn();

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
        updateTokenObject: updateTokenObject,
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

    test("If the response is empty string make the json null(because empty string which is usually the case with 204 status is not a valid json). There shouldn't be any error even if `isTokenObjectUnusable` and `isAccessTokenUnusable` do json()", async () => {
      const userId = 1;
      const invalidateTokenObject = vi.fn();
      const expireAccessToken = vi.fn();
      const updateTokenObject = vi.fn();

      const fetchNewTokenObject = vi
        .fn()
        .mockResolvedValue(generateJsonResponse({ json: getDummyTokenObject() }));

      const fakedFetchResponse = generateTextResponse({ text: "", status: 204 });

      const auth = new OAuthManager({
        credentialSyncVariables: useCredentialSyncVariables,
        resourceOwner: {
          type: "user",
          id: userId,
        },
        appSlug: "demo-app",
        currentTokenObject: getDummyTokenObject(),
        fetchNewTokenObject,
        isTokenObjectUnusable: async (response) => {
          return await response.json();
        },
        isAccessTokenUnusable: async (response) => {
          return await response.json();
        },
        invalidateTokenObject: invalidateTokenObject,
        updateTokenObject: updateTokenObject,
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
      const updateTokenObject = vi.fn();

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
        updateTokenObject: updateTokenObject,
        expireAccessToken: expireAccessToken,
      });

      fetchMock.mockReturnValueOnce(Promise.resolve(fakedFetchResponse));
      const { json, tokenStatus } = await auth.request({
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
      expect(json).toEqual(fakedFetchJsonResult);
      expect(tokenStatus).toEqual(TokenStatus.INCONCLUSIVE);
    });

    test("if `customFetch` throws error that is handled by `isTokenObjectUnusable` then `request` would still throw error but also invalidate", async () => {
      const userId = 1;
      const invalidateTokenObject = vi.fn();
      const expireAccessToken = vi.fn();
      const updateTokenObject = vi.fn();
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
        updateTokenObject: updateTokenObject,
        expireAccessToken: expireAccessToken,
      });

      await expect(
        auth.request(() => {
          throw new Error("Internal Server Error");
        })
      ).rejects.toThrowError("Internal Server Error");

      expect(invalidateTokenObject).toHaveBeenCalled();
    });
  });

  describe("API: `requestRaw`", () => {
    test("It would call fetch by adding Authorization and content header automatically", async () => {
      const userId = 1;
      const invalidateTokenObject = vi.fn();
      const expireAccessToken = vi.fn();
      const updateTokenObject = vi.fn();
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
        updateTokenObject: updateTokenObject,
        expireAccessToken: expireAccessToken,
      });

      fetchMock.mockReturnValueOnce(Promise.resolve(generateJsonResponse({ json: { key: "value" } })));
      const response = await auth.requestRaw({
        url: "https://example.com",
        options: {
          method: "POST",
          body: JSON.stringify({
            key: "value",
          }),
        },
      });

      expect(await response.json()).toEqual({ key: "value" });
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
  });

  // Credentials might have no userId attached in production. They could instead have teamId
  test("OAuthManager without resourceOwner.id is okay", async () => {
    const userId = null;
    const invalidateTokenObject = vi.fn();
    const expireAccessToken = vi.fn();
    const updateTokenObject = vi.fn();
    const fetchNewTokenObject = vi.fn().mockResolvedValue(successResponse({ json: getDummyTokenObject() }));

    expect(
      () =>
        new OAuthManager({
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
          updateTokenObject: updateTokenObject,
          expireAccessToken: expireAccessToken,
        })
    ).not.toThrowError();
  });
});

describe("Credential Sync Enabled", () => {
  const useCredentialSyncVariables = {
    ...credentialSyncVariables,
    APP_CREDENTIAL_SHARING_ENABLED: true,
  };
  describe("API: `getTokenObjectOrFetch`", () => {
    test("CREDENTIAL_SYNC_ENDPOINT is hit if no expiry_date is set in the `currentTokenObject`", async () => {
      const userId = 1;
      const invalidateTokenObject = vi.fn();
      const expireAccessToken = vi.fn();
      const updateTokenObject = vi.fn();
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
        updateTokenObject: updateTokenObject,
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
        const updateTokenObject = vi.fn();
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
          updateTokenObject: updateTokenObject,
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
        const updateTokenObject = vi.fn();
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
          updateTokenObject: updateTokenObject,
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

    test("OAuthManager without resourceOwner.id should throw error as it is a requirement", async () => {
      const userId = null;
      const invalidateTokenObject = vi.fn();
      const expireAccessToken = vi.fn();
      const updateTokenObject = vi.fn();
      const fetchNewTokenObject = vi.fn().mockResolvedValue(successResponse({ json: getDummyTokenObject() }));

      expect(
        () =>
          new OAuthManager({
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
            updateTokenObject: updateTokenObject,
            expireAccessToken: expireAccessToken,
          })
      ).toThrowError("resourceOwner should have id set");
    });
  });

  describe("API: `request`", () => {
    test("If `isTokenObjectUnusable` marks the response invalid, then `invalidateTokenObject` function is called", async () => {
      const userId = 1;
      const invalidateTokenObject = vi.fn();
      const expireAccessToken = vi.fn();
      const updateTokenObject = vi.fn();

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
        updateTokenObject: updateTokenObject,
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

    test("If neither of `isTokenObjectUnusable` and `isAccessTokenInvalid` mark the response invalid, but the response is still not OK then `markTokenExpired` is still called.", async () => {
      const userId = 1;
      const invalidateTokenObject = vi.fn();
      const expireAccessToken = vi.fn();
      const updateTokenObject = vi.fn();

      const fetchNewTokenObject = vi.fn();
      const fakedFetchJsonResult = { key: "value" };
      const fakedFetchResponse = internalServerErrorResponse({ json: fakedFetchJsonResult });

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
        isTokenObjectUnusable: async () => {
          return null;
        },
        isAccessTokenUnusable: async () => {
          return null;
        },
        invalidateTokenObject: invalidateTokenObject,
        updateTokenObject: updateTokenObject,
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
        tokenStatus: TokenStatus.INCONCLUSIVE,
        json: fakedFetchJsonResult,
      });
      expect(invalidateTokenObject).not.toHaveBeenCalled();
      expect(expireAccessToken).toHaveBeenCalled();
    });

    test("If neither of `isTokenObjectUnusable` and `isAccessTokenInvalid` mark the response invalid, and the response is also OK then `markTokenExpired` is not called.", async () => {
      const userId = 1;
      const invalidateTokenObject = vi.fn();
      const expireAccessToken = vi.fn();
      const updateTokenObject = vi.fn();

      const fetchNewTokenObject = vi.fn();
      const fakedFetchJsonResult = { key: "value" };
      const fakedFetchResponse = successResponse({ json: fakedFetchJsonResult });

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
        isTokenObjectUnusable: async () => {
          return null;
        },
        isAccessTokenUnusable: async () => {
          return null;
        },
        invalidateTokenObject: invalidateTokenObject,
        updateTokenObject: updateTokenObject,
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
        tokenStatus: TokenStatus.VALID,
        json: fakedFetchJsonResult,
      });
      expect(invalidateTokenObject).not.toHaveBeenCalled();
      expect(expireAccessToken).not.toHaveBeenCalled();
    });

    test("If `autoCheckTokenExpiryOnRequest` is true and token is expired, then token sync endpoint is hit", async () => {
      const userId = 1;
      const invalidateTokenObject = vi.fn();
      const expireAccessToken = vi.fn();
      const updateTokenObject = vi.fn();
      const fetchNewTokenObject = vi.fn();
      const currentTokenObject = getExpiredTokenObject();
      const newTokenObjectInResponse = getDummyTokenObject();
      const fakedTokenGetResponse = generateJsonResponse({ json: newTokenObjectInResponse });
      const fakedFetchJsonResult = { key: "value" };
      const fakedFetchResponse = successResponse({ json: fakedFetchJsonResult });

      const auth = new OAuthManager({
        autoCheckTokenExpiryOnRequest: true,
        credentialSyncVariables: useCredentialSyncVariables,
        resourceOwner: {
          type: "user",
          id: userId,
        },
        appSlug: "demo-app",
        currentTokenObject,
        fetchNewTokenObject,
        isTokenObjectUnusable: async () => {
          return null;
        },
        isAccessTokenUnusable: async () => {
          return null;
        },
        invalidateTokenObject: invalidateTokenObject,
        updateTokenObject: updateTokenObject,
        expireAccessToken: expireAccessToken,
      });

      // For fetch triggered by the token sync request
      fetchMock.mockReturnValueOnce(Promise.resolve(fakedTokenGetResponse));

      // For fetch triggered by the request call fetch
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
        tokenStatus: TokenStatus.VALID,
        json: fakedFetchJsonResult,
      });

      expect(updateTokenObject).toHaveBeenCalledWith(expect.objectContaining(newTokenObjectInResponse));
      // In credential sync mode, the expiry date is set to next year as it is not explicitly set in newTokenObject
      expectExpiryToBeNextYear(updateTokenObject.mock.calls[0][0].expiry_date);

      expect(invalidateTokenObject).not.toHaveBeenCalled();
      expect(expireAccessToken).not.toHaveBeenCalled();
    });

    test("If `autoCheckTokenExpiryOnRequest` is not set(default true is used) and token is expired, then token sync endpoint is hit", async () => {
      const userId = 1;
      const invalidateTokenObject = vi.fn();
      const expireAccessToken = vi.fn();
      const updateTokenObject = vi.fn();

      const fetchNewTokenObject = vi.fn();
      const fakedTokenGetJson = getDummyTokenObject();
      const fakedTokenGetResponse = generateJsonResponse({ json: fakedTokenGetJson });
      const fakedFetchJsonResult = { key: "value" };
      const fakedFetchResponse = successResponse({ json: fakedFetchJsonResult });

      const auth = new OAuthManager({
        credentialSyncVariables: useCredentialSyncVariables,
        resourceOwner: {
          type: "user",
          id: userId,
        },
        appSlug: "demo-app",
        currentTokenObject: getExpiredTokenObject(),
        fetchNewTokenObject,
        isTokenObjectUnusable: async () => {
          return null;
        },
        isAccessTokenUnusable: async () => {
          return null;
        },
        invalidateTokenObject: invalidateTokenObject,
        updateTokenObject: updateTokenObject,
        expireAccessToken: expireAccessToken,
      });

      // For fetch triggered by the token sync request
      fetchMock.mockReturnValueOnce(Promise.resolve(fakedTokenGetResponse));

      // For fetch triggered by the request call fetch
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
        tokenStatus: TokenStatus.VALID,
        json: fakedFetchJsonResult,
      });
      expect(updateTokenObject).toHaveBeenCalled();
      expect(invalidateTokenObject).not.toHaveBeenCalled();
      expect(expireAccessToken).not.toHaveBeenCalled();
    });
  });

  describe("API: `requestRaw`", () => {
    test("Though `isTokenObjectUnusable` and `isAccessTokenInvalid` aren't applicable here, but if the response is not OK then `markTokenExpired` is still called.", async () => {
      const userId = 1;
      const invalidateTokenObject = vi.fn();
      const expireAccessToken = vi.fn();
      const updateTokenObject = vi.fn();

      const fetchNewTokenObject = vi.fn();
      const fakedFetchJsonResult = { key: "value" };
      const fakedFetchResponse = internalServerErrorResponse({ json: fakedFetchJsonResult });

      const auth = new OAuthManager({
        autoCheckTokenExpiryOnRequest: false,
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
        isTokenObjectUnusable: async () => {
          return null;
        },
        isAccessTokenUnusable: async () => {
          return null;
        },
        invalidateTokenObject: invalidateTokenObject,
        updateTokenObject: updateTokenObject,
        expireAccessToken: expireAccessToken,
      });

      // For fetch triggered by the actual request
      fetchMock.mockReturnValueOnce(Promise.resolve(fakedFetchResponse));

      const response = await auth.requestRaw({
        url: "https://example.com",
        options: {
          method: "POST",
          body: JSON.stringify({
            key: "value",
          }),
        },
      });

      expect(await response.json()).toEqual(fakedFetchJsonResult);
      expect(invalidateTokenObject).not.toHaveBeenCalled();
      expect(expireAccessToken).toHaveBeenCalled();
    });

    test("Though `isTokenObjectUnusable` and `isAccessTokenInvalid` aren't applicable here, and the response is also OK then `markTokenExpired` is not called.", async () => {
      const userId = 1;
      const invalidateTokenObject = vi.fn();
      const expireAccessToken = vi.fn();
      const updateTokenObject = vi.fn();
      const fetchNewTokenObject = vi.fn();
      const fakedFetchJsonResult = { key: "value" };
      const fakedFetchResponse = successResponse({ json: fakedFetchJsonResult });

      const auth = new OAuthManager({
        autoCheckTokenExpiryOnRequest: false,
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
        isTokenObjectUnusable: async () => {
          return null;
        },
        isAccessTokenUnusable: async () => {
          return null;
        },
        invalidateTokenObject: invalidateTokenObject,
        updateTokenObject: updateTokenObject,
        expireAccessToken: expireAccessToken,
      });

      // For fetch triggered by the actual request
      fetchMock.mockReturnValueOnce(Promise.resolve(fakedFetchResponse));

      const response = await auth.requestRaw({
        url: "https://example.com",
        options: {
          method: "POST",
          body: JSON.stringify({
            key: "value",
          }),
        },
      });

      expect(await response.json()).toEqual(fakedFetchJsonResult);
      expect(invalidateTokenObject).not.toHaveBeenCalled();
      expect(expireAccessToken).not.toHaveBeenCalled();
    });
  });
});

function expectExpiryToBeNextYear(expiry_date: number) {
  expect(new Date(expiry_date).getFullYear() - new Date().getFullYear()).toBe(1);
}

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
