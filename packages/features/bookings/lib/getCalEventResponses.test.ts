import { describe, expect, it, vi } from "vitest";

vi.mock("@calcom/lib/contructEmailFromPhoneNumber", () => ({
  contructEmailFromPhoneNumber: vi.fn((phone: string) => `${phone}@phone.cal.com`),
}));

vi.mock("@calcom/lib/getBooking", () => ({
  getBookingWithResponses: vi.fn((booking: Record<string, unknown>) => ({
    responses: booking.responses || { name: "Test", email: "test@example.com" },
  })),
}));

import { getCalEventResponses } from "./getCalEventResponses";

describe("getCalEventResponses", () => {
  const makeBookingFields = (fields?: Record<string, unknown>[]) =>
    fields || [
      { name: "name", type: "name", label: "Your Name", editable: "system", required: true },
      { name: "email", type: "email", label: "Email", editable: "system", required: true },
      { name: "notes", type: "textarea", label: "Notes", editable: "system-but-optional", required: false },
      { name: "customField", type: "text", label: "Custom Field", editable: "user", required: false },
    ];

  it("maps responses with labels from booking fields", () => {
    const result = getCalEventResponses({
      bookingFields: makeBookingFields(),
      responses: {
        name: "John Doe",
        email: "john@example.com",
        notes: "Some notes",
        customField: "Custom value",
      },
    });

    expect(result.responses.name.label).toBe("Your Name");
    expect(result.responses.name.value).toBe("John Doe");
    expect(result.responses.email.value).toBe("john@example.com");
  });

  it("separates user fields from system fields", () => {
    const result = getCalEventResponses({
      bookingFields: makeBookingFields(),
      responses: {
        name: "John",
        email: "john@example.com",
        notes: "Notes",
        customField: "Custom",
      },
    });

    expect(result.userFieldsResponses).toHaveProperty("customField");
    expect(result.userFieldsResponses).not.toHaveProperty("name");
    expect(result.userFieldsResponses).not.toHaveProperty("email");
  });

  it("throws when both email and phone are missing", () => {
    expect(() =>
      getCalEventResponses({
        bookingFields: makeBookingFields(),
        responses: { name: "John" },
      })
    ).toThrow("Both Phone and Email are missing");
  });

  it("constructs email from phone number when email is missing", () => {
    const result = getCalEventResponses({
      bookingFields: makeBookingFields(),
      responses: {
        name: "John",
        attendeePhoneNumber: "+1234567890",
        notes: "",
      },
    });

    expect(result.responses.email.value).toBe("+1234567890@phone.cal.com");
  });

  it("clears guests for seated events", () => {
    const fields = [
      ...makeBookingFields(),
      {
        name: "guests",
        type: "multiemail",
        label: "Guests",
        editable: "system-but-optional",
        required: false,
      },
    ];
    const result = getCalEventResponses({
      bookingFields: fields,
      responses: {
        name: "John",
        email: "john@example.com",
        guests: ["a@example.com", "b@example.com"],
      },
      seatsEnabled: true,
    });

    expect(result.responses.guests.value).toEqual([]);
  });

  it("handles null bookingFields by using field names as labels", () => {
    const result = getCalEventResponses({
      bookingFields: null,
      responses: {
        name: "John",
        email: "john@example.com",
        customField: "value",
      },
    });

    expect(result.responses.customField.label).toBe("customField");
    expect(result.userFieldsResponses.customField.label).toBe("customField");
  });

  it("marks hidden fields in responses", () => {
    const fields = [
      { name: "hiddenField", type: "text", label: "Hidden", editable: "user", required: false, hidden: true },
      { name: "email", type: "email", label: "Email", editable: "system", required: true },
      { name: "name", type: "name", label: "Name", editable: "system", required: true },
    ];
    const result = getCalEventResponses({
      bookingFields: fields,
      responses: {
        name: "John",
        email: "john@example.com",
        hiddenField: "secret",
      },
    });

    expect(result.responses.hiddenField.isHidden).toBe(true);
  });

  it("falls back to booking data when responses are not provided", () => {
    const booking = {
      description: "notes text",
      customInputs: {},
      attendees: [{ email: "from-booking@example.com", name: "From Booking" }],
      location: "zoom",
      responses: { name: "From Booking", email: "from-booking@example.com" },
    };
    const result = getCalEventResponses({
      bookingFields: makeBookingFields(),
      booking: booking as never,
    });

    expect(result.responses.name.value).toBe("From Booking");
  });

  it("uses defaultLabel when label is not set", () => {
    const fields = [
      { name: "name", type: "name", defaultLabel: "Default Name Label", editable: "system", required: true },
      { name: "email", type: "email", defaultLabel: "Default Email", editable: "system", required: true },
    ];
    const result = getCalEventResponses({
      bookingFields: fields,
      responses: { name: "John", email: "john@example.com" },
    });

    expect(result.responses.name.label).toBe("Default Name Label");
  });
});
