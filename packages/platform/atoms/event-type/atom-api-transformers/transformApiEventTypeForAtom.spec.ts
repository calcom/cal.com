import type { EventTypeOutput } from "@calcom/platform-types";

import { transformApiEventTypeForAtom } from "./transformApiEventTypeForAtom";

describe("transformApiEventTypeForAtom", () => {
  it("should transform api event into atom event", () => {
    const input: EventTypeOutput = {
      id: 1977,
      ownerId: 549,
      lengthInMinutes: 60,
      title: "Lunch",
      slug: "lunch-1718184891397611306",
      description: "Eat your favorite food",
      locations: [
        {
          type: "address",
          address: "Via Roma 10, Rome, Italy",
        },
      ],
      bookingFields: [
        {
          type: "radio",
          label: "Food options",
          required: true,
          options: ["Pizza", "Ravioli", "Lasagna"],
        },
      ],
      recurringEvent: null,
      disableGuests: false,
      slotInterval: null,
      minimumBookingNotice: 120,
      beforeEventBuffer: 0,
      afterEventBuffer: 0,
      schedulingType: null,
      metadata: {},
      requiresConfirmation: false,
      price: 0,
      currency: "usd",
      lockTimeZoneToggleOnBookingPage: false,
      seatsPerTimeSlot: null,
      forwardParamsSuccessRedirect: true,
      successRedirectUrl: null,
      seatsShowAvailabilityCount: true,
      isInstantEvent: false,
      users: [
        {
          id: 549,
          name: "Lorenzo",
          username: "lorenzo-the-chief",
          brandColor: null,
          darkBrandColor: null,
          weekStart: "Sunday",
          metadata: {},
          avatarUrl: null,
        },
      ],
      schedule: {
        id: 166340,
        timeZone: "Europe/Rome",
      },
    };

    const expectedOutput = {
      id: 1977,
      title: "Lunch",
      description: "<p><code>Eat your favorite food</code></p>\n",
      eventName: null,
      slug: "lunch",
      isInstantEvent: false,
      aiPhoneCallConfig: null,
      schedulingType: null,
      length: 60,
      locations: [
        {
          type: "inPerson",
        },
      ],
      customInputs: [],
      disableGuests: false,
      metadata: {},
      lockTimeZoneToggleOnBookingPage: false,
      requiresConfirmation: false,
      requiresBookerEmailVerification: false,
      recurringEvent: null,
      price: 0,
      currency: "usd",
      seatsPerTimeSlot: null,
      seatsShowAvailabilityCount: true,
      bookingFields: [
        {
          name: "name",
          type: "name",
          defaultLabel: "your_name",
          required: true,
          editable: "system",
          sources: [
            {
              id: "default",
              type: "default",
              label: "Default",
            },
          ],
        },
        {
          name: "email",
          type: "email",
          defaultLabel: "email_address",
          required: true,
          editable: "system",
          sources: [
            {
              id: "default",
              type: "default",
              label: "Default",
            },
          ],
        },
        {
          name: "location",
          type: "radioInput",
          label: "",
          defaultLabel: "location",
          placeholder: "",
          required: false,
          getOptionsAt: "locations",
          optionsInputs: {
            phone: {
              type: "phone",
              required: true,
              placeholder: "",
            },
            attendeeInPerson: {
              type: "address",
              required: true,
              placeholder: "",
            },
          },
          hideWhenJustOneOption: true,
          editable: "system",
          sources: [
            {
              id: "default",
              type: "default",
              label: "Default",
            },
          ],
        },
        {
          name: "title",
          type: "text",
          defaultLabel: "what_is_this_meeting_about",
          defaultPlaceholder: "",
          required: true,
          hidden: true,
          editable: "system-but-optional",
          sources: [
            {
              id: "default",
              type: "default",
              label: "Default",
            },
          ],
        },
        {
          name: "notes",
          type: "textarea",
          defaultLabel: "additional_notes",
          defaultPlaceholder: "share_additional_notes",
          required: false,
          editable: "system-but-optional",
          sources: [
            {
              id: "default",
              type: "default",
              label: "Default",
            },
          ],
        },
        {
          name: "guests",
          type: "multiemail",
          defaultLabel: "additional_guests",
          defaultPlaceholder: "email",
          required: false,
          hidden: false,
          editable: "system-but-optional",
          sources: [
            {
              id: "default",
              type: "default",
              label: "Default",
            },
          ],
        },
        {
          name: "rescheduleReason",
          type: "textarea",
          defaultLabel: "reason_for_reschedule",
          defaultPlaceholder: "reschedule_placeholder",
          required: false,
          views: [
            {
              label: "Reschedule View",
              id: "reschedule",
            },
          ],
          editable: "system-but-optional",
          sources: [
            {
              id: "default",
              type: "default",
              label: "Default",
            },
          ],
        },
      ],
      team: null,
      successRedirectUrl: null,
      forwardParamsSuccessRedirect: true,
      workflows: [],
      hosts: [],
      owner: {
        id: 549,
        avatarUrl: null,
        username: "lorenzo-the-chief",
        name: "Lorenzo",
        weekStart: "Sunday",
        brandColor: null,
        darkBrandColor: null,
        theme: null,
        metadata: {},
        organization: null,
        defaultScheduleId: null,
        nonProfileUsername: "lauris",
        profile: {
          username: "lorenzo-the-chief",
          id: 549,
          userId: 549,
          name: "Lorenzo",
          organizationId: null,
          organization: null,
          upId: "485",
        },
      },
      schedule: {
        id: 166340,
        timeZone: "Europe/Rome",
      },
      hidden: false,
      assignAllTeamMembers: false,
      bookerLayouts: null,
      profile: {
        username: "lorenzo-the-chief",
        name: "Lorenzo",
        weekStart: "Sunday",
        image: null,
        brandColor: null,
        darkBrandColor: null,
        theme: null,
        bookerLayouts: null,
      },
      users: [
        {
          username: "lorenzo-the-chief",
          name: "Lorenzo",
          weekStart: "Sunday",
          organizationId: null,
          avatarUrl: null,
          profile: {
            username: "lorenzo-the-chief",
            id: 549,
            userId: 549,
            name: "Lorenzo",
            organizationId: null,
            organization: null,
            upId: "485",
          },
          bookerUrl: null,
        },
      ],
      entity: {
        fromRedirectOfNonOrgLink: true,
        considerUnpublished: false,
        orgSlug: null,
        teamSlug: null,
        name: undefined,
      },
      isDynamic: false,
    };

    const result = transformApiEventTypeForAtom(input);

    expect(result).toEqual(expectedOutput);
  });
});
