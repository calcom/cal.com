import { vi } from "vitest";

const setCredentialsMock = vi.fn();
const freebusyQueryMock = vi.fn();
const calendarListMock = vi.fn();
const calendarMockImplementation = {
  channels: {
    stop: vi.fn().mockResolvedValue(undefined),
  },
  calendarList: {
    list: calendarListMock,
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
  freebusy: {
    query: freebusyQueryMock,
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

export { calendarMock, adminMock, setCredentialsMock, freebusyQueryMock, calendarListMock };
