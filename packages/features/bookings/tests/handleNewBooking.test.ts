import type { Request, Response } from "express";
import type { NextApiRequest, NextApiResponse } from "next";
import { createMocks } from "node-mocks-http";
import { test } from "vitest";

// import { default as handleNewBooking } from "@calcom/features/bookings/lib/handleNewBooking";
import prisma from "@calcom/prisma";
import { getDate } from "@calcom/web/test/utils/bookingScenario";

type CustomNextApiRequest = NextApiRequest & Request;
type CustomNextApiResponse = NextApiResponse & Response;

// const prisma = new PrismaClient();

export function withPrisma(handler: any) {
  return async (req: any, res: any) => {
    if (!("prisma" in req)) {
      req.prisma = prisma;
    }
    return handler(req, res);
  };
}

test("handleNewBooking", async () => {
  const handleNewBooking = (await import("@calcom/features/bookings/lib/handleNewBooking")).default;
  // const booker = getBooker({
  //   email: "booker@example.com",
  //   name: "Booker",
  // });

  //   const organizer = getOrganizer({
  //     name: "Organizer",
  //     email: "organizer@example.com",
  //     id: 101,
  //     schedules: [TestData.schedules.IstWorkHours],
  //     credentials: [getGoogleCalendarCredential()],
  //     selectedCalendars: [TestData.selectedCalendars.google],
  //   });

  const pro30MinEventType = await prisma.eventType.findFirst({
    where: {
      slug: "30min",
      hosts: {
        some: {
          user: {
            email: "pro@example.com",
          },
        },
      },
    },
  });

  // const mockBookingData = getMockRequestDataForBooking({
  //   data: {
  //     eventTypeId: pro30MinEventType?.id,
  //     responses: {
  //       email: booker.email,
  //       name: booker.name,
  //       location: { optionValue: "", value: "integrations:daily" },
  //     },
  //   },
  // });

  const { req, res } = createMocks<CustomNextApiRequest, CustomNextApiResponse>({
    method: "POST",
    body: {
      eventTypeId: pro30MinEventType?.id,
      responses: {
        email: "booker@example.com",
        name: "Booker",
        location: { optionValue: "", value: "integrations:daily" },
      },
      start: `${getDate({ dateIncrement: 1 }).dateString}T04:00:00.000Z`,
      end: `${getDate({ dateIncrement: 1 }).dateString}T04:30:00.000Z`,
      timeZone: "Asia/Calcutta",
      language: "en",
      metadata: {},
      hasHashedBookingLink: false,
      hashedLink: null,
    },
    // prisma,
  });
  //   console.log("🚀 ~ file: handleNewBooking.test.ts:56 ~ test ~ prisma:", prisma);

  //   const { req, res } = createMockNextJsRequest({
  //     method: "POST",
  //     body: mockBookingData,
  //     prisma,
  //   });

  // withPrisma(async (req: NextApiRequest, res: NextApiResponse) => {
  //   // Your code here
  //   handleNewBooking(req);
  // })(req, res);

  const createdBooking = await handleNewBooking(req);
  console.log("🚀 ~ file: handleNewBooking.test.ts:49 ~ test ~ createdBooking:", createdBooking);
});

function createMockNextJsRequest(...args: Parameters<typeof createMocks>) {
  return createMocks<CustomNextApiRequest, CustomNextApiResponse>(...args);
}

function callWithPrisma(handler: any) {
  return async (req: any, res: any) => {
    if (!("prisma" in req)) {
      req.prisma = prisma;
    }
    return handler(req, res);
  };
}

function getBasicMockRequestDataForBooking() {
  return {
    start: `${getDate({ dateIncrement: 1 }).dateString}T04:00:00.000Z`,
    end: `${getDate({ dateIncrement: 1 }).dateString}T04:30:00.000Z`,
    eventTypeSlug: "no-confirmation",
    timeZone: "Asia/Calcutta",
    language: "en",
    bookingUid: "bvCmP5rSquAazGSA7hz7ZP",
    user: "teampro",
    metadata: {},
    hasHashedBookingLink: false,
    hashedLink: null,
  };
}

function getMockRequestDataForBooking({
  data,
}: {
  data: Partial<ReturnType<typeof getBasicMockRequestDataForBooking>> & {
    eventTypeId: number;
    responses: {
      email: string;
      name: string;
      location: { optionValue: ""; value: string };
    };
  };
}) {
  return {
    ...getBasicMockRequestDataForBooking(),
    ...data,
  };
}
