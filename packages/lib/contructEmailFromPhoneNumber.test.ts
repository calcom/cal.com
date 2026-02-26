import { describe, expect, it } from "vitest";

import { contructEmailFromPhoneNumber } from "./contructEmailFromPhoneNumber";

describe("contructEmailFromPhoneNumber", () => {
  it("converts a phone number with + prefix to sms email", () => {
    expect(contructEmailFromPhoneNumber("+1234567890")).toBe("1234567890@sms.cal.com");
  });

  it("handles phone number without + prefix", () => {
    expect(contructEmailFromPhoneNumber("1234567890")).toBe("1234567890@sms.cal.com");
  });

  it("strips multiple + characters", () => {
    expect(contructEmailFromPhoneNumber("+1+2+3")).toBe("123@sms.cal.com");
  });

  it("handles international format with country code", () => {
    expect(contructEmailFromPhoneNumber("+447911123456")).toBe("447911123456@sms.cal.com");
  });

  it("handles empty string", () => {
    expect(contructEmailFromPhoneNumber("")).toBe("@sms.cal.com");
  });
});
