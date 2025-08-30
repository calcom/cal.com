import { beforeEach, vi } from "vitest";
import { mockReset, mockDeep } from "vitest-mock-extended";

import type * as videoClient from "@calcom/lib/videoClient";

vi.mock("@calcom/lib/videoClient", () => videoClientMock);

beforeEach(() => {
  mockReset(videoClientMock);
});

const videoClientMock = mockDeep<typeof videoClient>();
export default videoClientMock;
