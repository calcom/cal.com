import { describe, expect, it } from "vitest";
import getBookingDataSchema from "./getBookingDataSchema";

describe("getBookingDataSchema", () => {
  const makeBookingFields = () => [
    {
      name: "name",
      type: "name" as const,
      label: "Your Name",
      required: true,
      sources: [{ id: "default", type: "default" as const, label: "Default" }],
    },
    {
      name: "email",
      type: "email" as const,
      label: "Email",
      required: true,
      sources: [{ id: "default", type: "default" as const, label: "Default" }],
    },
  ];

  it("returns a zod schema for booking view", () => {
    const schema = getBookingDataSchema({
      view: "booking",
      bookingFields: makeBookingFields() as never,
    });
    expect(schema).toBeDefined();
    expect(schema.parse).toBeDefined();
  });

  it("returns a zod schema for reschedule view", () => {
    const schema = getBookingDataSchema({
      view: "reschedule",
      bookingFields: makeBookingFields() as never,
    });
    expect(schema).toBeDefined();
    expect(schema.parse).toBeDefined();
  });

  it("schema includes responses field from booking fields", () => {
    const schema = getBookingDataSchema({
      view: "booking",
      bookingFields: makeBookingFields() as never,
    });

    expect(schema.shape).toHaveProperty("responses");
  });

  it("schema preserves extendedBookingCreateBody fields", () => {
    const schema = getBookingDataSchema({
      view: "booking",
      bookingFields: makeBookingFields() as never,
    });

    expect(schema.shape).toHaveProperty("start");
  });
});
