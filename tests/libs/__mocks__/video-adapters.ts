import { vi } from "vitest";

// Create a mock video adapter factory
const createMockVideoAdapter = (appName: string) => {
  // Return a factory function that creates the adapter when called with credentials
  return vi.fn().mockImplementation((_credential: unknown) => ({
    createMeeting: vi.fn().mockResolvedValue({
      type: appName === "dailyvideo" ? "daily_video" : `${appName}_video`,
      id: "MOCK_ID",
      password: "MOCK_PASS",
      url: `http://mock-${appName}.example.com/meeting-1`,
    }),
    updateMeeting: vi.fn().mockResolvedValue({
      type: appName === "dailyvideo" ? "daily_video" : `${appName}_video`,
      id: "MOCK_ID",
      password: "MOCK_PASS",
      url: `http://mock-${appName}.example.com/meeting-1`,
    }),
    deleteMeeting: vi.fn().mockResolvedValue(undefined),
    getAvailability: vi.fn().mockResolvedValue([]),
  }));
};

// Mock each individual video adapter module
vi.mock("@calcom/app-store/dailyvideo/lib/VideoApiAdapter", () => ({
  default: createMockVideoAdapter("dailyvideo"),
}));

vi.mock("@calcom/app-store/huddle01video/lib/VideoApiAdapter", () => ({
  default: createMockVideoAdapter("huddle01"),
}));

vi.mock("@calcom/app-store/jelly/lib/VideoApiAdapter", () => ({
  default: createMockVideoAdapter("jelly"),
}));

vi.mock("@calcom/app-store/jitsivideo/lib/VideoApiAdapter", () => ({
  default: createMockVideoAdapter("jitsi"),
}));

vi.mock("@calcom/app-store/nextcloudtalk/lib/VideoApiAdapter", () => ({
  default: createMockVideoAdapter("nextcloud"),
}));

vi.mock("@calcom/app-store/office365video/lib/VideoApiAdapter", () => ({
  default: createMockVideoAdapter("office365"),
}));

vi.mock("@calcom/app-store/shimmervideo/lib/VideoApiAdapter", () => ({
  default: createMockVideoAdapter("shimmer"),
}));

vi.mock("@calcom/app-store/sylapsvideo/lib/VideoApiAdapter", () => ({
  default: createMockVideoAdapter("sylaps"),
}));

vi.mock("@calcom/app-store/tandemvideo/lib/VideoApiAdapter", () => ({
  default: createMockVideoAdapter("tandem"),
}));

vi.mock("@calcom/app-store/webex/lib/VideoApiAdapter", () => ({
  default: createMockVideoAdapter("webex"),
}));

vi.mock("@calcom/app-store/zoomvideo/lib/VideoApiAdapter", () => ({
  default: createMockVideoAdapter("zoom"),
}));
