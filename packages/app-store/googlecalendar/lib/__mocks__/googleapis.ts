import { vi } from "vitest";

const setCredentialsMock = vi.fn();

const calendarMockImplementation = {
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

const calendarMock = {
  calendar_v3: {
    Calendar: vi.fn().mockImplementation(() => calendarMockImplementation),
  },
};
const adminMock = {
  admin_directory_v1: {
    Admin: vi.fn(),
  },
};

export { calendarMock, adminMock, setCredentialsMock };
