import { diff } from "jest-diff";
import { expect } from "vitest";

import type { Slot } from "@calcom/atoms/booker/types";

export const expectedSlotsForSchedule = {
  IstWorkHours: {
    interval: {
      "1hr": {
        allPossibleSlotsStartingAt430: [
          "04:30:00.000Z",
          "05:30:00.000Z",
          "06:30:00.000Z",
          "07:30:00.000Z",
          "08:30:00.000Z",
          "09:30:00.000Z",
          "10:30:00.000Z",
          "11:30:00.000Z",
        ],
        allPossibleSlotsStartingAt4: [
          "04:00:00.000Z",
          "05:00:00.000Z",
          "06:00:00.000Z",
          "07:00:00.000Z",
          "08:00:00.000Z",
          "09:00:00.000Z",
          "10:00:00.000Z",
          "11:00:00.000Z",
        ],
      },
    },
  },
  IstMorningShift: {
    interval: {
      "1hr": {
        allPossibleSlotsStartingAt430: [
          "04:30:00.000Z",
          "05:30:00.000Z",
          "06:30:00.000Z",
          "07:30:00.000Z",
          "08:30:00.000Z",
          "09:30:00.000Z",
          "10:30:00.000Z",
          "11:30:00.000Z",
        ],
        allPossibleSlotsStartingAt4: [
          "04:00:00.000Z",
          "05:00:00.000Z",
          "06:00:00.000Z",
          "07:00:00.000Z",
          "08:00:00.000Z",
          "09:00:00.000Z",
          "10:00:00.000Z",
          "11:00:00.000Z",
        ],
      },
    },
  },
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toHaveTimeSlots(expectedSlots: string[], date: { dateString: string; doExactMatch?: boolean }): R;
      /**
       * Explicitly checks if the date is disabled and fails if date is marked as OOO
       */
      toHaveDateDisabled(date: { dateString: string }): R;
      /**
       * Checks that all slots on a date are marked as holiday OOO.
       * Verifies: away=true, reason matches, fromUser is null (system-generated, not user-initiated),
       * and emoji is present. This distinguishes holiday OOO from regular user OOO
       * (which has fromUser set) and from busy/unavailable (which has no away flag).
       */
      toHaveAllSlotsAsHolidayOOO(date: { dateString: string; reason: string }): R;
    }
  }
}

expect.extend({
  toHaveTimeSlots(
    schedule: { slots: Record<string, Slot[]> },
    expectedSlots: string[],
    { dateString, doExactMatch }: { dateString: string; doExactMatch: boolean }
  ) {
    if (!schedule.slots[`${dateString}`]) {
      return {
        pass: false,
        message: () => `has no timeslots for ${dateString}`,
      };
    }

    const expectedSlotHasFullTimestamp = expectedSlots[0].split("-").length === 3;

    if (
      !schedule.slots[`${dateString}`]
        .map((slot) => slot.time)
        .every((actualSlotTime, index) => {
          const expectedSlotTime = expectedSlotHasFullTimestamp
            ? expectedSlots[index]
            : `${dateString}T${expectedSlots[index]}`;
          return expectedSlotTime === actualSlotTime;
        })
    ) {
      return {
        pass: false,
        message: () =>
          `has incorrect timeslots for ${dateString}.\n\r ${diff(
            expectedSlots.map((expectedSlot) => {
              if (expectedSlotHasFullTimestamp) {
                return expectedSlot;
              }
              return `${dateString}T${expectedSlot}`;
            }),
            schedule.slots[`${dateString}`].map((slot) => slot.time)
          )}`,
      };
    }

    if (doExactMatch) {
      return {
        pass: expectedSlots.length === schedule.slots[`${dateString}`].length,
        message: () =>
          `number of slots don't match for ${dateString}. Expected ${expectedSlots.length} but got ${
            schedule.slots[`${dateString}`].length
          }`,
      };
    }

    return {
      pass: true,
      message: () => "has correct timeslots ",
    };
  },

  toHaveDateDisabled(schedule: { slots: Record<string, Slot[]> }, { dateString }: { dateString: string }) {
    // Frontend requires that the date must not be set for that date to be shown as disabled.Because weirdly, if an empty array is provided the date itself isn't shown which we don't want
    if (!schedule.slots[`${dateString}`]) {
      return {
        pass: true,
        message: () => `is not disabled for ${dateString}`,
      };
    }

    if (schedule.slots[`${dateString}`].length === 0) {
      return {
        pass: false,
        message: () => `is all day OOO for ${dateString}.`,
      };
    }
    return {
      pass: false,
      message: () => `has timeslots for ${dateString}`,
    };
  },

  toHaveAllSlotsAsHolidayOOO(
    schedule: {
      slots: Record<string, Array<{ away?: boolean; reason?: string; fromUser?: unknown; emoji?: string }>>;
    },
    { dateString, reason }: { dateString: string; reason: string }
  ) {
    const slots = schedule.slots[`${dateString}`];
    if (!slots) {
      return {
        pass: false,
        message: () => `has no slots for ${dateString}`,
      };
    }

    if (slots.length === 0) {
      return {
        pass: false,
        message: () => `has empty slots array for ${dateString}`,
      };
    }

    const nonAwaySlot = slots.find((s) => s.away !== true);
    if (nonAwaySlot) {
      return {
        pass: false,
        message: () => `has slot without away=true on ${dateString}`,
      };
    }

    const wrongReasonSlot = slots.find((s) => s.reason !== reason);
    if (wrongReasonSlot) {
      return {
        pass: false,
        message: () =>
          `has slot with reason "${wrongReasonSlot.reason}" instead of "${reason}" on ${dateString}`,
      };
    }

    // Holiday OOO has fromUser=null (system-generated). Regular user OOO has fromUser={id, displayName}.
    const userInitiatedSlot = slots.find((s) => s.fromUser !== null && s.fromUser !== undefined);
    if (userInitiatedSlot) {
      return {
        pass: false,
        message: () =>
          `has slot with fromUser set on ${dateString} — this looks like regular user OOO, not holiday OOO`,
      };
    }

    const noEmojiSlot = slots.find((s) => !s.emoji);
    if (noEmojiSlot) {
      return {
        pass: false,
        message: () => `has slot without emoji on ${dateString}`,
      };
    }

    return {
      pass: true,
      message: () => `all slots are holiday OOO with reason "${reason}" on ${dateString}`,
    };
  },
});

export { expect } from "vitest";
