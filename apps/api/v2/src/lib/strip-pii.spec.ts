import { stripPiiFromObject, stripPiiFromResponseData } from "./strip-pii";

describe("stripPiiFromResponseData", () => {
  it("removes top-level PII fields", () => {
    const data = {
      status: "success",
      email: "user@example.com",
      name: "John Doe",
      displayEmail: "john@example.com",
    };
    const result = stripPiiFromResponseData(data);
    expect(result).toEqual({ status: "success" });
  });

  it("removes PII fields from nested data object", () => {
    const data = {
      status: "success",
      data: {
        id: 1,
        email: "user@example.com",
        name: "John Doe",
        displayEmail: "john@example.com",
        startTime: "2024-01-01T00:00:00Z",
      },
    };
    const result = stripPiiFromResponseData(data);
    expect(result).toEqual({
      status: "success",
      data: {
        id: 1,
        startTime: "2024-01-01T00:00:00Z",
      },
    });
  });

  it("removes PII fields from items in data array", () => {
    const data = {
      status: "success",
      data: [
        { id: 1, email: "a@example.com", name: "Alice", title: "Meeting" },
        { id: 2, email: "b@example.com", name: "Bob", title: "Call" },
      ],
    };
    const result = stripPiiFromResponseData(data);
    expect(result).toEqual({
      status: "success",
      data: [
        { id: 1, title: "Meeting" },
        { id: 2, title: "Call" },
      ],
    });
  });

  it("sanitizes attendees to keep only id", () => {
    const data = {
      status: "success",
      data: {
        id: 1,
        attendees: [
          { id: 10, email: "a@example.com", displayEmail: "a@example.com", name: "Alice", timeZone: "UTC" },
          { id: 20, email: "b@example.com", displayEmail: "b@example.com", name: "Bob", timeZone: "UTC" },
        ],
      },
    };
    const result = stripPiiFromResponseData(data);
    expect(result).toEqual({
      status: "success",
      data: {
        id: 1,
        attendees: [{ id: 10 }, { id: 20 }],
      },
    });
  });

  it("removes bookingFieldsResponses entirely", () => {
    const data = {
      status: "success",
      data: {
        id: 1,
        bookingFieldsResponses: {
          name: "John Doe",
          email: "john@example.com",
          notes: "Please call me",
          location: "Zoom",
        },
      },
    };
    const result = stripPiiFromResponseData(data);
    expect(result).toEqual({
      status: "success",
      data: {
        id: 1,
      },
    });
  });

  it("passes through non-object data array items unchanged", () => {
    const data = {
      status: "success",
      data: [1, "hello", null],
    };
    const result = stripPiiFromResponseData(data);
    expect(result).toEqual({
      status: "success",
      data: [1, "hello", null],
    });
  });

  it("handles empty data object", () => {
    const result = stripPiiFromResponseData({});
    expect(result).toEqual({});
  });

  it("preserves non-PII fields at all levels", () => {
    const data = {
      status: "success",
      data: {
        id: 1,
        title: "Team Meeting",
        startTime: "2024-01-01T00:00:00Z",
        endTime: "2024-01-01T01:00:00Z",
      },
    };
    const result = stripPiiFromResponseData(data);
    expect(result).toEqual(data);
  });
});

describe("stripPiiFromObject", () => {
  it("strips PII from a request body", () => {
    const body = {
      name: "John Doe",
      email: "john@example.com",
      startTime: "2024-01-01T00:00:00Z",
      endTime: "2024-01-01T01:00:00Z",
      eventTypeId: 123,
      timeZone: "America/New_York",
    };
    const result = stripPiiFromObject(body);
    expect(result).toEqual({
      startTime: "2024-01-01T00:00:00Z",
      endTime: "2024-01-01T01:00:00Z",
      eventTypeId: 123,
      timeZone: "America/New_York",
    });
  });

  it("strips attendees from request body to keep only id", () => {
    const body = {
      eventTypeId: 123,
      attendees: [
        { id: 1, email: "a@example.com", name: "Alice" },
        { id: 2, email: "b@example.com", name: "Bob" },
      ],
    };
    const result = stripPiiFromObject(body);
    expect(result).toEqual({
      eventTypeId: 123,
      attendees: [{ id: 1 }, { id: 2 }],
    });
  });

  it("removes bookingFieldsResponses from request body", () => {
    const body = {
      eventTypeId: 123,
      bookingFieldsResponses: { name: "John", email: "john@example.com", notes: "hi" },
    };
    const result = stripPiiFromObject(body);
    expect(result).toEqual({ eventTypeId: 123 });
  });
});
