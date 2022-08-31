/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@lib/prisma";
import runMiddleware, { checkAmiliAuth } from "../../../../lib/amili/middleware";
import { listCalendars, getAvailabilityOutlookCalendar } from "../../../../lib/amili/calendarService";
import { getAvailabilityGoogleCalendar } from "../../../../lib/amili/googleCalendarService";

const groupCalendarIgnore = ["Birthdays", "United States holidays"];

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { method, query } = req;

  if (method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  await runMiddleware(req, res, checkAmiliAuth);

  try {
    const { userId: id, startDate: dateFrom, endDate: dateEnd } = query;

    const credentials = await prisma.credential.findMany({
      where: { userId: +id },
    });

    const booking = await prisma.booking.findMany({
      where: { userId: +id },
    });

    const idsBooking = booking.map((x) => x.id);

    const bookingReference = await prisma.bookingReference.findMany({
      where: { bookingId: { in: idsBooking } },
    });

    let result = [] as any;

    const googleCalendarCredential = credentials.find((x) => x.type === "google_calendar");
    const outlookCalendarCredential = credentials.find((x) => x.type === "office365_calendar");

    if (outlookCalendarCredential) {
      let res = await listCalendars(outlookCalendarCredential);
      res = res.filter((c) => !groupCalendarIgnore.includes(c.name));
      const bookingReferenceOutlook = bookingReference
        .filter((x) => x.type === "office365_calendar")
        .map((y) => y.uid);
      let data: any = await getAvailabilityOutlookCalendar(
        dateFrom as string,
        dateEnd as string,
        res,
        outlookCalendarCredential,
        bookingReferenceOutlook
      );
      data = (data || [])?.filter(Boolean);
      result = result.concat(data);
    }

    if (googleCalendarCredential) {
      const bookingReferenceGoogleCalendar = bookingReference
        .filter((x) => x.type === "google_calendar")
        .map((y) => y.uid);
      const data: any = await getAvailabilityGoogleCalendar(
        dateFrom as string,
        dateEnd as string,
        googleCalendarCredential
      );

      result = result.concat(data);
    }

    return res.status(201).json({ availability: result });
  } catch (e) {
    console.log({ e });
    const { error, status } = e;

    return res.status(201).json({ availability: [] });
  }
};

export default handler;
