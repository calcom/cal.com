import type * as googleapis from "googleapis";
import { beforeEach, vi } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";

vi.mock("googleapis", () => googleapisMock);

beforeEach(() => {
  mockReset(googleapisMock);
});

const googleapisMock = mockDeep<typeof googleapis>({
  fallbackMockImplementation: (...args) => {
    console.log(args);
    throw new Error("Unimplemented");
  },
});

const setCredentialsMock = vi.fn();
googleapisMock.google = {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  calendar: vi.fn().mockReturnValue({
    channels: {
      stop: vi.fn().mockResolvedValue(undefined),
    },
    events: {
      watch: vi.fn().mockResolvedValue({
        data: {
          kind: "api#channel",
          id: "mock-channel-id",
          resourceId: "mock-resource-id",
          resourceUri: "mock-resource-uri",
          expiration: "1111111111",
        },
      }),
    },
  }),
  auth: {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    OAuth2: function MockGoogleOAuth2() {
      return {
        setCredentials: setCredentialsMock,
      };
    },
  },
};

export default googleapisMock;
export { googleapisMock, setCredentialsMock };
