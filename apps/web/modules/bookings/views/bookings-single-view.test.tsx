import { render } from "@testing-library/react";
import React from "react";
import { describe, it, expect } from "vitest";

import { BookingStatus } from "@calcom/prisma/enums";
import { HeadSeo } from "@calcom/ui";

import Success from "./bookings-single-view";

describe("Success Component", () => {
  it("renders HeadSeo correctly", () => {
    const mockObject = {
      props: {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-ignore
        eventType: {
          bookingFields: [],
        },
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        profile: {
          name: "John",
        },
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        bookingInfo: {
          status: BookingStatus.ACCEPTED,
          attendees: [],
          responses: {
            name: "John",
          },
        },
        orgSlug: "org1",
      } satisfies React.ComponentProps<typeof Success>,
    };

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
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
