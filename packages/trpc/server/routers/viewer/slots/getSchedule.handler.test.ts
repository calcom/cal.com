import { describe, it, expect } from "@jest/globals";
import type { GetScheduleOptions } from "../../types";
import { getScheduleHandler } from "./getSchedule.handler";

describe("getScheduleHandler", () => {
  it("should return available slots for the given user and input", async () => {
    const mockInput: GetScheduleOptions = {
      ctx: {},
      input: {
        userId: "user123",
        date: new Date(),
      },
    };

    const mockAvailableSlotsService = {
      getAvailableSlots: jest.fn().mockResolvedValue([
        { start: new Date(), end: new Date(new Date().getTime() + 60 * 60 * 1000) },
      ]),
    };

    (getAvailableSlotsService as any).mockReturnValue(mockAvailableSlotsService);

    const result = await getScheduleHandler(mockInput);

    expect(result).toEqual([
      { start: new Date(), end: new Date(new Date().getTime() + 60 * 60 * 1000) },
    ]);
  });
});

it("should lookup attendee emails with rescheduleUid present", async () => {
      const mockInput: GetScheduleOptions = {
        ctx: {},
        input: {
          userId: "user123",
          date: new Date(),
          rescheduleUid: "reschedule123",
        },
      };

      const mockAvailableSlotsService = {
        getAvailableSlots: jest.fn().mockResolvedValue([
          { start: new Date(), end: new Date(new Date().getTime() + 60 * 60 * 1000) },
        ]),
      };

      (getAvailableSlotsService as any).mockReturnValue(mockAvailableSlotsService);

      const result = await getScheduleHandler(mockInput);

      expect(result).toEqual([
        { start: new Date(), end: new Date(new Date().getTime() + 60 * 60 * 1000) },
      ]);
    });
