import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { buildChecksum, buildSignedUrl, generateMeetingPassword, parseBbbResponse, callBbb, BbbApiError } from "./bbbClient";

describe("buildChecksum", () => {
  it("应该返回 40 字符的十六进制 SHA1 校验和", () => {
    const checksum = buildChecksum("create", "name=Test&meetingID=abc", "secret123");
    expect(checksum).toHaveLength(40);
    expect(/^[0-9a-f]{40}$/.test(checksum)).toBe(true);
  });

  it("应该为不同输入生成不同的校验和", () => {
    const cs1 = buildChecksum("create", "name=Test", "secret1");
    const cs2 = buildChecksum("create", "name=Test", "secret2");
    expect(cs1).not.toBe(cs2);
  });

  it("空查询字符串也能正确工作", () => {
    const checksum = buildChecksum("getMeetings", "", "secret");
    expect(checksum).toHaveLength(40);
  });
});

describe("buildSignedUrl", () => {
  it("应该构建包含校验和的完整 URL", () => {
    const url = buildSignedUrl(
      "https://bbb.example.com/bigbluebutton",
      "create",
      "name=Test&meetingID=abc",
      "secret"
    );
    expect(url).toContain("https://bbb.example.com/bigbluebutton/api/create");
    expect(url).toContain("name=Test&meetingID=abc");
    expect(url).toContain("checksum=");
  });

  it("空查询字符串也能正确工作", () => {
    const url = buildSignedUrl("https://bbb.example.com/bigbluebutton", "getMeetings", "", "secret");
    expect(url).toBe("https://bbb.example.com/bigbluebutton/api/getMeetings?checksum=");
    // 使用更宽松的匹配 -- 验证包含正确的路径和校验和参数
    expect(url).toMatch(/\/api\/getMeetings\?checksum=[0-9a-f]{40}$/);
  });
});

describe("generateMeetingPassword", () => {
  it("应该生成 32 字符的十六进制字符串", () => {
    const pw = generateMeetingPassword();
    expect(pw).toHaveLength(32);
    expect(/^[0-9a-f]{32}$/.test(pw)).toBe(true);
  });

  it("每次调用应该生成不同的密码", () => {
    const pw1 = generateMeetingPassword();
    const pw2 = generateMeetingPassword();
    expect(pw1).not.toBe(pw2);
  });
});

describe("parseBbbResponse", () => {
  it("应该正确解析成功的 XML 返回", () => {
    const xml = `<response><returncode>SUCCESS</returncode><meetings/></response>`;
    const result = parseBbbResponse(xml);
    expect(result.returncode).toBe("SUCCESS");
  });

  it("returncode 非 SUCCESS 时应该抛出 BbbApiError", () => {
    const xml = `<response><returncode>FAILED</returncode><messageKey>checksumError</messageKey><message>Invalid checksum</message></response>`;
    expect(() => parseBbbResponse(xml)).toThrow(BbbApiError);
  });

  it("畸形 XML 应该抛出 BbbApiError", () => {
    expect(() => parseBbbResponse("<not>valid</xml")).toThrow(BbbApiError);
  });

  it("缺少 returncode 应该抛出 BbbApiError", () => {
    const xml = `<response><other>data</other></response>`;
    expect(() => parseBbbResponse(xml)).toThrow(BbbApiError);
  });
});

describe("callBbb", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("成功调用应该返回解析后的数据", async () => {
    const mockXml = `<response><returncode>SUCCESS</returncode><meetings/></response>`;
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      text: async () => mockXml,
    } as Response);

    const result = await callBbb(
      "https://bbb.example.com/bigbluebutton",
      "getMeetings",
      "",
      "secret"
    );
    expect(result.returncode).toBe("SUCCESS");
  });

  it("HTTP 非 200 状态应该抛出 BbbApiError（错误路径测试）", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    } as Response);

    await expect(
      callBbb("https://bbb.example.com/bigbluebutton", "create", "name=Test", "secret")
    ).rejects.toThrow(BbbApiError);
  });

  it("HTTP 403 状态应该抛出 BbbApiError（错误路径测试）", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: "Forbidden",
    } as Response);

    await expect(
      callBbb("https://bbb.example.com/bigbluebutton", "create", "name=Test", "secret")
    ).rejects.toThrow(BbbApiError);
  });

  it("BBB 返回 FAILED 状态应该抛出 BbbApiError（错误路径测试）", async () => {
    const failXml = `<response><returncode>FAILED</returncode><messageKey>invalidParam</messageKey><message>Missing meetingID</message></response>`;
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      text: async () => failXml,
    } as Response);

    await expect(
      callBbb("https://bbb.example.com/bigbluebutton", "create", "", "secret")
    ).rejects.toThrow(BbbApiError);
  });

  it("BBB 返回畸形 XML 应该抛出 BbbApiError（错误路径测试）", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      text: async () => "<not>valid-xml",
    } as Response);

    await expect(
      callBbb("https://bbb.example.com/bigbluebutton", "create", "name=Test", "secret")
    ).rejects.toThrow(BbbApiError);
  });

  it("请求超时应该被正确处理（错误路径测试）", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementationOnce(() => {
      return new Promise((_resolve, reject) => {
        const err = new DOMException("The operation was aborted", "AbortError");
        reject(err);
      });
    });

    await expect(
      callBbb("https://bbb.example.com/bigbluebutton", "create", "name=Test", "secret")
    ).rejects.toThrow();
  });
});