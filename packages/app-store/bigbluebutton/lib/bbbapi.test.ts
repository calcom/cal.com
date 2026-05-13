import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { BBBApi } from "./bbbapi";
import { Role } from "./types";

const mockFetch = vi.fn();

const options = {
  url: "https://bbb.example.com/bigbluebutton/api",
  secret: "test-secret",
  hash: "sha256" as const,
};

const instanceInfoXml = `<?xml version="1.0"?>
<response>
  <returncode>SUCCESS</returncode>
  <apiVersion>2.4</apiVersion>
</response>`;

const oldInstanceInfoXml = `<?xml version="1.0"?>
<response>
  <returncode>SUCCESS</returncode>
  <apiVersion>2.3</apiVersion>
</response>`;

const createMeetingXml = `<?xml version="1.0"?>
<response>
  <returncode>SUCCESS</returncode>
  <meetingID>booking-uid</meetingID>
</response>`;

const joinMeetingXml = `<?xml version="1.0"?>
<response>
  <returncode>SUCCESS</returncode>
  <url>https://bbb.example.com/html5client?sessionToken=abc</url>
</response>`;

const checksumErrorXml = `<?xml version="1.0"?>
<response>
  <returncode>FAILED</returncode>
  <messageKey>checksumError</messageKey>
  <message>Checksums do not match</message>
</response>`;

const getMeetingsXml = `<?xml version="1.0"?>
<response>
  <returncode>SUCCESS</returncode>
  <meetings></meetings>
</response>`;

function xmlResponse(xml: string, ok = true) {
  return {
    ok,
    text: () => Promise.resolve(xml),
  };
}

describe("BBBApi", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("signs API URLs using the configured hash", () => {
    const api = new BBBApi(options);
    const params = new URLSearchParams({ meetingID: "booking-uid", name: "Demo" });
    const url = api.createUrl("create", params);
    const expectedChecksum = createHash("sha256")
      .update(`create${params.toString()}${options.secret}`)
      .digest("hex");

    expect(url).toBe(
      `https://bbb.example.com/bigbluebutton/api/create?${params.toString()}&checksum=${expectedChecksum}`
    );
  });

  test("creates and joins meetings", async () => {
    mockFetch
      .mockResolvedValueOnce(xmlResponse(createMeetingXml))
      .mockResolvedValueOnce(xmlResponse(joinMeetingXml));

    const api = new BBBApi(options);

    await expect(api.createMeeting("booking-uid", "Demo")).resolves.toEqual({ success: true });
    await expect(api.joinMeeting("booking-uid", "Ada Lovelace", Role.MODERATOR)).resolves.toEqual({
      success: true,
      data: { url: "https://bbb.example.com/html5client?sessionToken=abc" },
    });
  });

  test("validates server version and checksum", async () => {
    mockFetch
      .mockResolvedValueOnce(xmlResponse(instanceInfoXml))
      .mockResolvedValueOnce(xmlResponse(getMeetingsXml));

    await expect(new BBBApi(options).checkValidOptions()).resolves.toBe(true);
  });

  test("rejects unsupported server versions", async () => {
    mockFetch.mockResolvedValueOnce(xmlResponse(oldInstanceInfoXml));

    await expect(new BBBApi(options).checkValidOptions()).resolves.toBe(false);
  });

  test("rejects invalid checksums", async () => {
    mockFetch
      .mockResolvedValueOnce(xmlResponse(instanceInfoXml))
      .mockResolvedValueOnce(xmlResponse(checksumErrorXml));

    await expect(new BBBApi(options).checkValidOptions()).resolves.toBe(false);
  });

  test("blocks unsafe server URLs before fetching", async () => {
    await expect(
      new BBBApi({ ...options, url: "http://169.254.169.254/latest/meta-data" }).checkValidOptions()
    ).resolves.toBe(false);

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
