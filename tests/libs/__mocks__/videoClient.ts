import { beforeEach, vi } from "vitest";
import { mockReset, mockDeep } from "vitest-mock-extended";

import type * as videoClient from "@calcom/features/conferencing/lib/videoClient";
import type * as recordingService from "@calcom/features/conferencing/lib/recordingService";

vi.mock("@calcom/features/conferencing/lib/videoClient", () => videoClientMock);
vi.mock("@calcom/features/conferencing/lib/recordingService", () => videoClientMock);

beforeEach(() => {
  mockReset(videoClientMock);
});

const videoClientMock = mockDeep<typeof videoClient>();
export default videoClientMock;
