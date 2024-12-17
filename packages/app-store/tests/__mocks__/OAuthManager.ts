import { beforeEach, vi } from "vitest";
import { mockClear, mockDeep } from "vitest-mock-extended";

import type * as OAuthManager from "../../_utils/oauth/OAuthManager";

vi.mock("../../_utils/oauth/OAuthManager", () => oAuthManagerMock);

beforeEach(() => {
  mockClear(oAuthManagerMock);
});

const oAuthManagerMock = mockDeep<typeof OAuthManager>({
  fallbackMockImplementation: () => {
    throw new Error("Unimplemented");
  },
});
export default oAuthManagerMock;
const defaultMockOAuthManager = vi.fn().mockImplementation(() => {
  return {
    getTokenObjectOrFetch: vi.fn().mockImplementation(() => {
      return {
        token: {
          access_token: "FAKE_ACCESS_TOKEN",
        },
      };
    }),
    request: vi.fn().mockResolvedValue({
      json: {
        calendars: [],
      },
    }),
  };
});

export { oAuthManagerMock, defaultMockOAuthManager };
