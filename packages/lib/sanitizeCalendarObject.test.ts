import { describe, expect, it } from "vitest";
import { sanitizeCalendarObject } from "./sanitizeCalendarObject";

const createDAVObject = (data: string) => ({ data, etag: "", url: "" });

describe("sanitizeCalendarObject", () => {
  it("normalizes \\r\\n line endings", () => {
    const obj = createDAVObject("BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n");
    const result = sanitizeCalendarObject(obj);

    expect(result).toBe("BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n");
  });

  it("normalizes standalone \\r to \\r\\n", () => {
    const obj = createDAVObject("BEGIN:VCALENDAR\rEND:VCALENDAR\r");
    const result = sanitizeCalendarObject(obj);

    expect(result).toBe("BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n");
  });

  it("removes line folding (\\n followed by space)", () => {
    const obj = createDAVObject("DESCRIPTION:This is a long\r\n description");
    const result = sanitizeCalendarObject(obj);

    expect(result).toBe("DESCRIPTION:This is a longdescription");
  });

  it("removes line folding (\\n followed by tab)", () => {
    const obj = createDAVObject("SUMMARY:Long\r\n\tText");
    const result = sanitizeCalendarObject(obj);

    expect(result).toBe("SUMMARY:LongText");
  });

  it("fixes broken colons across line breaks", () => {
    const obj = createDAVObject("DTSTART:\n:20260101T100000Z");
    const result = sanitizeCalendarObject(obj);

    expect(result).toBe("DTSTART:20260101T100000Z");
  });

  it("fixes broken semicolons across line breaks", () => {
    const obj = createDAVObject("RRULE:FREQ=WEEKLY;\n;BYDAY=MO");
    const result = sanitizeCalendarObject(obj);

    expect(result).toBe("RRULE:FREQ=WEEKLY;BYDAY=MO");
  });

  it("fixes broken equals signs across line breaks", () => {
    const obj = createDAVObject("X-PROP=\n=value");
    const result = sanitizeCalendarObject(obj);

    expect(result).toBe("X-PROP=value");
  });

  it("handles already-clean iCalendar data", () => {
    const cleanData =
      "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nSUMMARY:Test\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n";
    const obj = createDAVObject(cleanData);
    const result = sanitizeCalendarObject(obj);

    expect(result).toBe(cleanData);
  });

  it("handles empty data string", () => {
    const obj = createDAVObject("");
    const result = sanitizeCalendarObject(obj);

    expect(result).toBe("");
  });

  it("handles complex iCalendar with multiple issues", () => {
    const messyData =
      "BEGIN:VCALENDAR\rVERSION:2.0\r\nBEGIN:VEVENT\nSUMMARY:Long\n Event\nEND:VEVENT\rEND:VCALENDAR";
    const obj = createDAVObject(messyData);
    const result = sanitizeCalendarObject(obj);

    expect(result).not.toContain("\r\n ");
    expect(result).toContain("\r\n");
  });
});
