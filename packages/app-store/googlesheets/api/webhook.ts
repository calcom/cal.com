import type { NextApiRequest, NextApiResponse } from "next";

import { getBookingFieldsWithSystemFields } from "@calcom/features/bookings/lib/getBookingFields";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import { HttpError } from "@calcom/lib/http-error";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";

import type { GoogleSheetsCredential } from "../lib/SheetsService";
import GoogleSheetsServiceWrapper from "../lib/SheetsService.wrapper";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { type, payload } = req.body;

  if (type !== "BOOKING_CREATED" && type !== "BOOKING_RESCHEDULED" && type !== "BOOKING_CANCELLED") {
    return res.status(200).json({ message: `Webhook received for ${type} event` });
  }

  const booking = payload.booking;
  if (!booking) {
    throw new HttpError({ statusCode: 400, message: "Missing booking data" });
  }

  const eventType = await prisma.eventType.findUnique({
    where: {
      id: booking.eventTypeId,
    },
    select: {
      id: true,
      title: true,
      metadata: true,
    },
  });

  if (!eventType) {
    throw new HttpError({ statusCode: 404, message: "Event type not found" });
  }

  const metadata = eventType.metadata as unknown as {
    googleSheets?: {
      spreadsheetId?: string;
      enabled?: boolean;
    };
  };

  if (!metadata?.googleSheets?.enabled || !metadata?.googleSheets?.spreadsheetId) {
    return res.status(200).json({ message: "Google Sheets integration not enabled for this event type" });
  }

  const credential = await prisma.credential.findFirst({
    where: {
      type: "google_sheets",
      userId: booking.userId,
    },
  });

  if (!credential) {
    throw new HttpError({ statusCode: 400, message: "Google Sheets credential not found" });
  }

  const bookingFields = await getBookingFieldsWithSystemFields(booking);
  const calEventResponses = await getCalEventResponses({
    bookingFields,
    booking,
  });

  const formattedData = [
    booking.uid,
    eventType.title,
    booking.attendees[0]?.name || "",
    booking.attendees[0]?.email || "",
    new Date(booking.startTime).toISOString(),
    new Date(booking.endTime).toISOString(),
    booking.status,
    booking.location || "",
    booking.description || "",
    new Date(booking.createdAt).toISOString(),
    new Date(booking.updatedAt).toISOString(),
  ];

  Object.entries(calEventResponses).forEach(([key, value]) => {
    if (key !== "name" && key !== "email") {
      formattedData.push(value?.toString() || "");
    }
  });

  try {
    const sheetsService = new GoogleSheetsServiceWrapper(credential as unknown as GoogleSheetsCredential);

    await sheetsService.appendBookingRow(metadata.googleSheets.spreadsheetId, formattedData);

    return res.status(200).json({ message: "Booking data sent to Google Sheets successfully" });
  } catch (error) {
    console.error("Error sending booking data to Google Sheets:", error);
    throw new HttpError({ statusCode: 500, message: "Failed to send booking data to Google Sheets" });
  }
}

export default defaultHandler({
  POST: Promise.resolve({ default: defaultResponder(handler) }),
});
