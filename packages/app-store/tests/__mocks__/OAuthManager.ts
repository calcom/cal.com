import { beforeEach, vi } from "vitest";
import { mockReset, mockDeep } from "vitest-mock-extended";

import type * as OAuthManager from "../../_utils/oauth/OAuthManager";

vi.mock("../../_utils/oauth/OAuthManager", () => oAuthManagerMock);

beforeEach(() => {
  mockReset(oAuthManagerMock);
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
