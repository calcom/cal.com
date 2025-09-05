import type * as videoClient from "@calcom/lib/videoClient";
import { beforeEach, vi } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";

vi.mock("@calcom/lib/videoClient", () => videoClientMock);

beforeEach(() => {
  mockReset(videoClientMock);
});

const videoClientMock = mockDeep<typeof videoClient>();
export default videoClientMock;
