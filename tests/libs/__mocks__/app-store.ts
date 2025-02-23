import { beforeEach, vi } from "vitest";
import { mockReset, mockDeep } from "vitest-mock-extended";

import type * as appStore from "@calcom/app-store";

vi.mock("@calcom/app-store", () => appStoreMock);

beforeEach(() => {
  mockReset(appStoreMock);
});

const mockDailyVideo = {
  slug: "daily-video",
  dirName: "dailyvideo",
  // Add other required app properties here
  keys: { apikey: "MOCK_DAILY_API_KEY" },
  createCredential: vi.fn().mockImplementation(() => ({
    type: "daily_video",
    key: { apikey: "MOCK_DAILY_API_KEY" },
  })),
  updateMeeting: vi.fn().mockResolvedValue({}),
};

const appStoreMock = mockDeep<typeof appStore>({
  fallbackMockImplementation: () => ({
    "daily-video": mockDailyVideo,
  }),
});
export default appStoreMock;
