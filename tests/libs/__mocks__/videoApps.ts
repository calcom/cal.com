import { beforeEach, vi } from "vitest";
import { mockReset, mockDeep } from "vitest-mock-extended";

import type { videoLoaders } from "@calcom/app-store/_utils/videos/videoLoaders";

vi.mock("@calcom/app-store/_utils/videos/videoLoaders", () => videoAppsMock);

beforeEach(() => {
  mockReset(videoAppsMock);
});

export const videoAppsMock = mockDeep<typeof videoLoaders>({
  fallbackMockImplementation: () => {
    throw new Error(
      "Unimplemented videoAppsMock. You seem to have not mocked the app that you are trying to use"
    );
  },
});
