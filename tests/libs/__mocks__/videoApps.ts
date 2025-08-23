import { beforeEach, vi } from "vitest";
import { mockReset } from "vitest-mock-extended";

import type * as videoLoaders from "@calcom/app-store/_utils/videos/videoLoaders";

import { mockDeepHelper } from "./mockDeepHelper";

const videoAppsMock = mockDeepHelper<typeof videoLoaders>("videoAppsMock");

vi.mock("@calcom/app-store/_utils/videos/videoLoaders", () => videoAppsMock);

beforeEach(() => {
  mockReset(videoAppsMock);
});

export default videoAppsMock;
