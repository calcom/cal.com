import type { NextApiRequest, NextApiResponse } from "next";

import { logger } from "@calcom/lib/logger";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { CredentialRepository } from "@calcom/lib/server/repository/credential";
import { prisma } from "@calcom/prisma";
import type { CalendarEvent } from "@calcom/types/Calendar";

import GoogleSheetsService from "../lib/GoogleSheetsService";

// Supported webhook events for Google Sheets export
const SUPPORTED_WEBHOOK_EVENTS = [
  "BOOKING_CREATED",
  "BOOKING_CANCELLED", 
  "BOOKING_RESCHEDULED",
  "BOOKING_PAID",
  "BOOKING_PAYMENT_INITIATED",
  "BOOKING_REQUESTED",
  "BOOKING_REJECTED",
  "BOOKING_NO_SHOW_UPDATED",
  "MEETING_STARTED",
  "MEETING_ENDED",
  "INSTANT_MEETING",
  "RECORDING_READY",
  "RECORDING_TRANSCRIPTION_GENERATED",
];

async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  const { triggerEvent, payload } = req.body;

  // Only process supported webhook events
  if (!SUPPORTED_WEBHOOK_EVENTS.includes(triggerEvent)) {
    logger.debug("Unsupported webhook event for Google Sheets", { triggerEvent });
    return res.status(200).json({ message: "Event not supported" });
  }

  const calendarEvent: CalendarEvent = payload;

  // Check if we have the required data
  if (!calendarEvent.eventTypeId) {
    logger.debug("No event type ID in webhook payload", { triggerEvent });
    return res.status(200).json({ message: "No event type ID" });
  }

  try {
    // Get event type and check if Google Sheets is enabled
    const eventType = await prisma.eventType.findUnique({
      where: { id: calendarEvent.eventTypeId },
      include: {
        users: {
          include: {
            credentials: {
              where: {
                type: "googlesheets_other",
                invalid: false,
              },
            },
          },
        },
        team: {
          include: {
            members: {
              include: {
                user: {
                  include: {
                    credentials: {
                      where: {
                        type: "googlesheets_other",
                        invalid: false,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!eventType) {
      logger.debug("Event type not found", { eventTypeId: calendarEvent.eventTypeId });
      return res.status(200).json({ message: "Event type not found" });
    }

    // Check if Google Sheets is enabled for this event type
    const eventTypeMetadata = eventType.metadata as any;
    const googleSheetsConfig = eventTypeMetadata?.apps?.googlesheets;
    
    if (!googleSheetsConfig?.enabled) {
      logger.debug("Google Sheets not enabled for event type", { 
        eventTypeId: calendarEvent.eventTypeId 
      });
      return res.status(200).json({ message: "Google Sheets not enabled" });
    }

    const spreadsheetId = googleSheetsConfig.spreadsheetId;
    if (!spreadsheetId) {
      logger.debug("No spreadsheet ID configured", { 
        eventTypeId: calendarEvent.eventTypeId 
      });
      return res.status(200).json({ message: "No spreadsheet configured" });
    }

    // Find a valid Google Sheets credential
    let credential = null;

    // First try to find credential from event type users
    for (const user of eventType.users) {
      if (user.credentials.length > 0) {
        credential = user.credentials[0];
        break;
      }
    }

    // If not found and it's a team event, try team members
    if (!credential && eventType.team) {
      for (const member of eventType.team.members) {
        if (member.user.credentials.length > 0) {
          credential = member.user.credentials[0];
          break;
        }
      }
    }

    if (!credential) {
      logger.error("No valid Google Sheets credential found", {
        eventTypeId: calendarEvent.eventTypeId,
        triggerEvent,
      });
      return res.status(200).json({ message: "No valid credential found" });
    }

    // Export data to Google Sheets
    const sheetsService = new GoogleSheetsService(credential);
    await sheetsService.exportBookingData(spreadsheetId, calendarEvent);

    logger.info("Successfully exported booking data to Google Sheets", {
      eventTypeId: calendarEvent.eventTypeId,
      bookingId: calendarEvent.bookingId,
      triggerEvent,
      spreadsheetId,
    });

    res.status(200).json({ message: "Data exported successfully" });
  } catch (error) {
    logger.error("Failed to export booking data to Google Sheets", {
      eventTypeId: calendarEvent.eventTypeId,
      bookingId: calendarEvent.bookingId,
      triggerEvent,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    // Don't fail the webhook, just log the error
    res.status(200).json({ message: "Export failed but webhook processed" });
  }
}

export default defaultHandler({
  POST: Promise.resolve({ default: defaultResponder(postHandler) }),
});