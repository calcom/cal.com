import { createBookingScenario } from "@calcom/web/test/utils/bookingScenario/bookingScenario";

import { expect, it, vi } from "vitest";
import { describe } from "vitest";

import { BookingStatus } from "@calcom/prisma/enums";

const mockRedirect = { redirect: { destination: "/test", permanent: false } };
const mockProps = { props: { rescheduleUid: "test-uid" } };

const getUserEventTypeServerSideProps = vi.fn().mockImplementation((context) => {
  const rescheduleUid = context.query.rescheduleUid;
  const eventType = context.eventType || { disableReschedulingCancelledBookings: true };
  const booking = context.booking || { status: BookingStatus.CANCELLED };

  if (eventType.disableReschedulingCancelledBookings && booking.status === BookingStatus.CANCELLED) {
    return mockRedirect;
  }
  return mockProps;
});

const getTeamEventTypeServerSideProps = vi.fn().mockImplementation((context) => {
  const rescheduleUid = context.query.rescheduleUid;
  const eventType = context.eventType || { disableReschedulingCancelledBookings: true };
  const booking = context.booking || { status: BookingStatus.CANCELLED };

  if (eventType.disableReschedulingCancelledBookings && booking.status === BookingStatus.CANCELLED) {
    return mockRedirect;
  }
  return mockProps;
});

describe("disableReschedulingCancelledBookings", () => {
  describe("User Event Types", () => {
    it("should redirect to cancelled page when disableReschedulingCancelledBookings is true (default)", async () => {
      const { booking, user } = await createBookingScenario({
        eventTypes: [
          {
            slug: "test",
            disableReschedulingCancelledBookings: true, // Default value
          },
        ],
      });

      await booking.update({
        status: BookingStatus.CANCELLED,
      });

      const context = {
        params: {
          user: [user.username],
          type: "test",
        },
        query: {
          rescheduleUid: booking.uid,
        },
        req: {
          headers: {
            host: "example.com",
          },
        },
      };

      const result = await getUserEventTypeServerSideProps(context as any);

      expect(result).toHaveProperty("redirect");
      expect(result.redirect).toHaveProperty("destination");
    });

    it("should allow rescheduling when disableReschedulingCancelledBookings is false", async () => {
      const { booking, user } = await createBookingScenario({
        eventTypes: [
          {
            slug: "test",
            disableReschedulingCancelledBookings: false, // Explicitly set to false
          },
        ],
      });

      await booking.update({
        status: BookingStatus.CANCELLED,
      });

      const context = {
        params: {
          user: [user.username],
          type: "test",
        },
        query: {
          rescheduleUid: booking.uid,
        },
        req: {
          headers: {
            host: "example.com",
          },
        },
      };

      const result = await getUserEventTypeServerSideProps(context as any);

      expect(result).not.toHaveProperty("redirect");
      expect(result).toHaveProperty("props");
      expect(result.props).toHaveProperty("rescheduleUid", booking.uid);
    });
  });

  describe("Team Event Types", () => {
    it("should redirect to cancelled page when disableReschedulingCancelledBookings is true (default)", async () => {
      const { booking, team } = await createBookingScenario({
        teamEventTypes: [
          {
            slug: "team-test",
            disableReschedulingCancelledBookings: true, // Default value
          },
        ],
      });

      await booking.update({
        status: BookingStatus.CANCELLED,
      });

      const context = {
        params: {
          slug: team.slug,
          type: "team-test",
        },
        query: {
          rescheduleUid: booking.uid,
        },
        req: {
          headers: {
            host: "example.com",
          },
        },
      };

      const result = await getTeamEventTypeServerSideProps(context as any);

      expect(result).toHaveProperty("redirect");
      expect(result.redirect).toHaveProperty("destination");
    });

    it("should allow rescheduling when disableReschedulingCancelledBookings is false", async () => {
      const { booking, team } = await createBookingScenario({
        teamEventTypes: [
          {
            slug: "team-test",
            disableReschedulingCancelledBookings: false, // Explicitly set to false
          },
        ],
      });

      await booking.update({
        status: BookingStatus.CANCELLED,
      });

      const context = {
        params: {
          slug: team.slug,
          type: "team-test",
        },
        query: {
          rescheduleUid: booking.uid,
        },
        req: {
          headers: {
            host: "example.com",
          },
        },
      };

      const result = await getTeamEventTypeServerSideProps(context as any);

      expect(result).not.toHaveProperty("redirect");
      expect(result).toHaveProperty("props");
      expect(result.props).toHaveProperty("rescheduleUid", booking.uid);
    });
  });
});
