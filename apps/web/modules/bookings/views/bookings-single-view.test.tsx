import { render } from "@testing-library/react";
import { useSession } from "next-auth/react";
import React from "react";
import { describe, it, expect, vi } from "vitest";
import type { z } from "zod";

import { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import { BookingStatus } from "@calcom/prisma/enums";
import { HeadSeo } from "@calcom/ui";

import Success from "./bookings-single-view";

function mockedSuccessComponentProps(props: Partial<React.ComponentProps<typeof Success>>) {
  return {
    eventType: {
      id: 1,
      title: "Event Title",
      description: "",
      locations: null,
      length: 15,
      userId: null,
      eventName: "d",
      timeZone: null,
      recurringEvent: null,
      requiresConfirmation: false,
      disableGuests: false,
      seatsPerTimeSlot: null,
      seatsShowAttendees: null,
      seatsShowAvailabilityCount: null,
      schedulingType: null,
      price: 0,
      currency: "usd",
      successRedirectUrl: null,
      customInputs: [],
      teamId: null,
      team: null,
      workflows: [],
      hosts: [],
      users: [],
      owner: null,
      isDynamic: false,
      periodStartDate: "1",
      periodEndDate: "1",
      metadata: null,
      bookingFields: [] as unknown as [] & z.BRAND<"HAS_SYSTEM_FIELDS">,
    },
    profile: {
      name: "John",
      email: null,
      theme: null,
      brandColor: null,
      darkBrandColor: null,
      slug: null,
    },
    bookingInfo: {
      uid: "uid",
      metadata: null,
      customInputs: [],
      startTime: new Date(),
      endTime: new Date(),
      id: 1,
      user: null,
      eventType: null,
      seatsReferences: [],
      userPrimaryEmail: null,
      eventTypeId: null,
      title: "Booking Title",
      description: null,
      location: null,
      recurringEventId: null,
      smsReminderNumber: "0",
      cancellationReason: null,
      rejectionReason: null,
      status: BookingStatus.ACCEPTED,
      attendees: [],
      responses: {
        name: "John",
      },
      rescheduled: false,
      fromReschedule: null,
    },
    orgSlug: null,
    userTimeFormat: 12,
    requiresLoginToUpdate: false,
    themeBasis: "dark",
    hideBranding: false,
    recurringBookings: null,
    trpcState: {
      queries: [],
      mutations: [],
    },
    dynamicEventName: "Event Title",
    paymentStatus: null,
    rescheduledToUid: null,
    ...props,
  } satisfies React.ComponentProps<typeof Success>;
}

describe("Success Component", () => {
  it("renders HeadSeo correctly", () => {
    vi.mocked(getOrgFullOrigin).mockImplementation((text: string | null) => `${text}.cal.local`);
    vi.mocked(useRouterQuery).mockReturnValue({
      uid: "uid",
    });
    vi.mock("@calcom/lib/constants", async (importOriginal) => {
      const actual = await importOriginal<any>();
      return {
        ...actual,
        CURRENT_TIMEZONE: "Europe/London",
      };
    });
    vi.mocked(useSession).mockReturnValue({
      update: vi.fn(),
      status: "authenticated",
      data: {
        hasValidLicense: true,
        upId: "1",
        expires: "1",
        user: {
          name: "John",
          id: 1,
          profile: {
            id: null,
            upId: "1",
            username: null,
            organizationId: null,
            organization: null,
          },
        },
      },
    });

    const mockObject = {
      props: mockedSuccessComponentProps({
        orgSlug: "org1",
      }),
    };

    render(<Success {...mockObject.props} />);

    const expectedTitle = `booking_confirmed`;
    const expectedDescription = expectedTitle;
    expect(HeadSeo).toHaveBeenCalledWith(
      {
        origin: `${mockObject.props.orgSlug}.cal.local`,
        title: expectedTitle,
        description: expectedDescription,
      },
      {}
    );
  });
});
