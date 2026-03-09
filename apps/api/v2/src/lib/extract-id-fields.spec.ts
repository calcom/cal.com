import { extractIdFields } from "./extract-id-fields";

describe("extractIdFields", () => {
  it("should extract fields containing 'id' (case-insensitive)", () => {
    const input = {
      id: 123,
      eventTypeId: 456,
      userId: 789,
      name: "John Doe",
      email: "john@example.com",
    };

    expect(extractIdFields(input)).toEqual({
      id: 123,
      eventTypeId: 456,
      userId: 789,
    });
  });

  it("should extract fields containing 'uid' (case-insensitive)", () => {
    const input = {
      uid: "abc-123",
      bookingUid: "def-456",
      title: "Meeting",
    };

    expect(extractIdFields(input)).toEqual({
      uid: "abc-123",
      bookingUid: "def-456",
    });
  });

  it("should handle mixed id and uid fields", () => {
    const input = {
      id: 1,
      uid: "abc",
      eventTypeId: 2,
      rescheduleUid: "def",
      name: "Test",
      email: "test@test.com",
      description: "A long description with PII",
    };

    expect(extractIdFields(input)).toEqual({
      id: 1,
      uid: "abc",
      eventTypeId: 2,
      rescheduleUid: "def",
    });
  });

  it("should be case-insensitive for field names", () => {
    const input = {
      ID: 1,
      UID: "abc",
      EventTypeID: 2,
      bookingUID: "def",
      Name: "Test",
    };

    expect(extractIdFields(input)).toEqual({
      ID: 1,
      UID: "abc",
      EventTypeID: 2,
      bookingUID: "def",
    });
  });

  it("should return empty object for empty input", () => {
    expect(extractIdFields({})).toEqual({});
  });

  it("should return empty object for null/undefined input", () => {
    expect(extractIdFields(null as unknown as Record<string, unknown>)).toEqual({});
    expect(extractIdFields(undefined as unknown as Record<string, unknown>)).toEqual({});
  });

  it("should not include fields that don't contain id or uid", () => {
    const input = {
      name: "John",
      email: "john@example.com",
      title: "Meeting",
      startTime: "2024-01-01",
      attendees: [{ name: "Jane" }],
      description: "Private notes",
      bookingFieldsResponses: { phone: "+1234567890" },
    };

    expect(extractIdFields(input)).toEqual({});
  });

  it("should not match fields where id/uid is a substring (false positives)", () => {
    const input = {
      hidden: true,
      video: "https://example.com",
      provider: "google",
      valid: true,
      grid: 4,
      android: "13",
      guidance: "some text",
      fluid: 1.5,
    };

    expect(extractIdFields(input)).toEqual({});
  });

  it("should match snake_case id/uid fields", () => {
    const input = {
      user_id: 123,
      booking_uid: "abc-456",
      event_type_id: 789,
      name: "Test",
    };

    expect(extractIdFields(input)).toEqual({
      user_id: 123,
      booking_uid: "abc-456",
      event_type_id: 789,
    });
  });
});
