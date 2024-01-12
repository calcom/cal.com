import { describe, expect, it } from "vitest";

import { getCalVideoReference } from "./get-cal-video-reference";

describe("Cal Video", () => {
  it("should load latest cal video reference", () => {
    expect(
      getCalVideoReference([
        {
          id: 1,
          uid: "UID1",
          type: "daily_video",
          meetingId: "ID1",
          meetingPassword: "P1",
        },
        {
          id: 2,
          uid: "UID2",
          type: "daily_video",
          meetingId: "ID2",
          meetingPassword: "P2",
        },
      ])
    ).toEqual({
      id: 2,
      uid: "UID2",
      type: "daily_video",
      meetingId: "ID2",
      meetingPassword: "P2",
    });
  });
});
