import { beforeEach, vi } from "vitest";

vi.mock("googleapis", () => googleapisMock);
vi.mock("google-auth-library", () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({
    setCredentials: setCredentialsMock,
  })),
}));
vi.mock("@googleapis/admin", () => adminMock);

beforeEach(() => {
  vi.clearAllMocks();
  setCredentialsMock.mockClear();
  googleapisMock.calendar_v3.Calendar.mockClear();
  adminMock.admin_directory_v1.Admin.mockClear();
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
};
const adminMock = {
  admin_directory_v1: {
    Admin: vi.fn(),
  },
};

export default googleapisMock;
export { googleapisMock, setCredentialsMock };
