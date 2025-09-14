import { beforeEach, vi } from "vitest";
import { mockClear, mockDeep } from "vitest-mock-extended";

import type * as OAuthManager from "../../_utils/oauth/OAuthManager";

vi.mock("../../_utils/oauth/OAuthManager", () => oAuthManagerMock);
let useFullMockOAuthManagerRequest: boolean | null = null;

beforeEach(() => {
  mockClear(oAuthManagerMock);
  useFullMockOAuthManagerRequest = null;
});

const oAuthManagerRequestFullMock = async (fn: () => Promise<Response>) => {
  const res = await fn();
  return {
    json: await res.json(),
  };
};

const oAuthManagerMock = mockDeep<typeof OAuthManager>({
  fallbackMockImplementation: () => {
    throw new Error("Unimplemented");
  },
});

// Add the static inMemoryLocks property to the mock
oAuthManagerMock.OAuthManager.inMemoryLocks = new Map();

export default oAuthManagerMock;
const setFullMockOAuthManagerRequest = () => {
  useFullMockOAuthManagerRequest = true;
};
const defaultMockOAuthManager = vi.fn().mockImplementation(() => {
  return {
    getTokenObjectOrFetch: vi.fn().mockImplementation(() => {
      return {
        token: {
          access_token: "FAKE_ACCESS_TOKEN",
        },
      };
    }),
    request: vi.fn().mockImplementation((fn) => {
      if (useFullMockOAuthManagerRequest) {
        console.log("OAuthManager.request full mock being used");
        return oAuthManagerRequestFullMock(fn);
      }
      console.log("OAuthManager.request default mock being used");
      return {
        json: {
          calendars: [],
        },
      };
    }),
  };
});

// Add static properties to match the actual OAuthManager class
defaultMockOAuthManager.inMemoryLocks = new Map();

export { oAuthManagerMock, defaultMockOAuthManager, setFullMockOAuthManagerRequest };
