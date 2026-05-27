import { describe, expect, test } from "vitest";
import { testHelpers } from "./VideoApiAdapter";

describe("BigBlueButton VideoApiAdapter helpers", () => {
  test("normalizes server URLs to the BigBlueButton API path", () => {
    expect(testHelpers.normalizeServerUrl("https://bbb.example.com").toString()).toBe(
      "https://bbb.example.com/api/"
    );
    expect(testHelpers.normalizeServerUrl("https://bbb.example.com/bigbluebutton/api/").toString()).toBe(
      "https://bbb.example.com/bigbluebutton/api/"
    );
  });

  test("creates signed API URLs with checksums", () => {
    const url = testHelpers.createApiUrl({
      callName: "create",
      serverUrl: "https://bbb.example.com",
      sharedSecret: "secret",
      params: {
        name: "Demo Meeting",
        meetingID: "booking-123",
      },
    });

    expect(url).toBe(
      "https://bbb.example.com/api/create?name=Demo+Meeting&meetingID=booking-123&checksum=f902c3bc5984e0cb403b17eed581ed99195d15a4"
    );
  });
});
