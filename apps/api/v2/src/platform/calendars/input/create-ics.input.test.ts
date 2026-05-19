import { validate } from "class-validator";
import { CreateIcsFeedInputDto } from "./create-ics.input";

describe("CreateIcsFeedInputDto Validation", () => {
  it("should accept a standard .ics URL", async () => {
    const input = new CreateIcsFeedInputDto();
    input.urls = ["https://example.com/calendar.ics"];
    const errors = await validate(input);
    expect(errors.length).toBe(0);
  });

  // 👇 The Bug Fix test
  it("should accept valid ICS URLs without a .ics extension (Fixes #29286)", async () => {
    const input = new CreateIcsFeedInputDto();
    input.urls = ["https://caldav.soverin.net/calendars/MyCalendar?export"];
    const errors = await validate(input);
    expect(errors.length).toBe(0);
  });

  it("should reject plain strings and malformed URLs", async () => {
    const input = new CreateIcsFeedInputDto();
    input.urls = ["not-a-valid-url"];
    const errors = await validate(input);
    expect(errors.length).toBeGreaterThan(0);
  });

  // 👇 The SSRF Security test
  it("should reject localhost and local IPs to prevent SSRF", async () => {
    const input = new CreateIcsFeedInputDto();
    input.urls = ["http://localhost:3000/fake-calendar"];
    const errors = await validate(input);
    expect(errors.length).toBeGreaterThan(0);
  });
});