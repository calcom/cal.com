import { beforeEach, vi } from "vitest";
import { mockReset } from "vitest-mock-extended";

vi.mock("googleapis", () => googleapisMock);

beforeEach(() => {
  mockReset(googleapisMock);
});
const setCredentialsMock = vi.fn();

const calendarMock = {
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
};

const googleapisMock = {
  calendar_v3: {
    Calendar: vi.fn().mockImplementation(() => calendarMock),
  },
  oauth2_v2: {
    Oauth2: vi.fn(),
  },
  admin_directory_v1: {
    Admin: vi.fn(),
  },
};

vi.mock("google-auth-library", () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({
    setCredentials: setCredentialsMock,
  })),
}));

export default googleapisMock;
export { googleapisMock, setCredentialsMock };
