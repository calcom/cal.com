import { beforeEach, vi } from "vitest";
import { mockReset } from "vitest-mock-extended";

import type * as videoLoaders from "@calcom/app-store/_utils/videos/videoLoaders";

import { mockDeepHelper } from "./mockDeepHelper";

const videoLoadersMock = mockDeepHelper<typeof videoLoaders>("videoLoadersMock");

vi.mock("@calcom/app-store/_utils/videos/videoLoaders", () => videoLoadersMock);

beforeEach(() => {
  mockReset(videoLoadersMock);
});

export default videoLoadersMock;
