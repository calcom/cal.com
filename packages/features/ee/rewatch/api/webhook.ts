import crypto from "crypto";
import { buffer } from "micro";
import type { NextApiRequest, NextApiResponse } from "next";

import { sendDailyVideoRecordingEmails } from "@calcom/emails";
import { handleWebhookTrigger } from "@calcom/features/bookings/lib/handleWebhookTrigger";
import { HttpError as HttpCode } from "@calcom/lib/http-error";
import { getTranslation } from "@calcom/lib/server/i18n";
import { prisma } from "@calcom/prisma";
import type { WebhookTriggerEvents } from "@calcom/prisma/enums";

const apiUrl = `https://${process.env.REWATCH_SUBDOMAIN}.rewatch.com/api/graphql`;
const authToken = `Token token="${process.env.REWATCH_ACCESS_TOKEN}"`;
const SECRETS = process.env.REWATCH_WEBHOOK_SECRETS?.split(",") || [];

export const config = {
  api: {
    bodyParser: false,
  },
};

async function fetchVideoDetails(videoId: string) {
  const query = `
    query MyQuery($videoId: ID!) {
      channel {
        videos(ids: [$videoId], first: 1) {
          nodes {
            externalMeetingInstance {
              externalMeetingId
            }
          }
        }
      }
    }
  `;
  const variables = {
    videoId,
  };

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: authToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response?.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

async function updateBookingRecordingLink(bookingId: number, recordingLink: string) {
  try {
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        recordingLink: recordingLink,
      },
      select: {
        id: true,
        uid: true,
        title: true,
        attendees: true,
        user: {
          select: {
            id: true,
            timeZone: true,
            email: true,
            name: true,
            locale: true,
            destinationCalendar: true,
          },
        },
        description: true,
        references: {
          select: {
            meetingId: true,
            meetingUrl: true,
          },
        },
        startTime: true,
        endTime: true,
        createdAt: true,
        updatedAt: true,
        location: true,
        status: true,
        rejectionReason: true,
        fromReschedule: true,
        rescheduled: true,
        responses: true,
        recordingLink: true,
      },
    });

    const eventTrigger: WebhookTriggerEvents = "MEETING_ENDED";
    // Send Webhook call if hooked to BOOKING.RECORDING_READY
    const subscriberOptions = {
      triggerEvent: eventTrigger,
    };
    const t = await getTranslation(updatedBooking?.user?.locale ?? "en", "common");
    const attendeesListPromises = updatedBooking.attendees.map(async (attendee) => {
      return {
        id: attendee.id,
        name: attendee.name,
        email: attendee.email,
        timeZone: attendee.timeZone,
        language: {
          translate: await getTranslation(attendee.locale ?? "en", "common"),
          locale: attendee.locale ?? "en",
        },
      };
    });

    const attendeesList = await Promise.all(attendeesListPromises);
    const evt = {
      type: updatedBooking.title,
      title: updatedBooking.title,
      description: updatedBooking.description || undefined,
      startTime: updatedBooking.startTime.toISOString(),
      endTime: updatedBooking.endTime.toISOString(),
      organizer: {
        email: updatedBooking.user?.email || "Email-less",
        name: updatedBooking.user?.name || "Nameless",
        timeZone: updatedBooking.user?.timeZone || "Europe/London",
        language: { translate: t, locale: updatedBooking?.user?.locale ?? "en" },
      },
      attendees: attendeesList,
      uid: updatedBooking.uid,
    };
    // Add emails from the "guests" field of the "responses" object (if it exists)
    // Initialize evt.attendees as an empty array
    // evt.attendees = [];

    // Add the user's email to the attendees list if available
    // if (updatedBooking.user?.email) {
    //   evt.attendees.push({ email: updatedBooking.user.email });
    // }

    // Iterate through responses and add guest emails to evt.attendees
    // if (updatedBooking.responses) {
    //   if (updatedBooking.responses?.guests?.length) {
    //     // Add guest emails to evt.attendees
    //     for (const guestEmail of updatedBooking.responses.guests) {
    //       evt.attendees.push({
    //         email: guestEmail,
    //         language: { translate: t, locale: updatedBooking?.user?.locale ?? "en" },
    //       });
    //     }
    //   }
    //   if (updatedBooking.responses.email) {
    //     // Add the response email to evt.attendees
    //     evt.attendees.push({
    //       email: updatedBooking.responses.email,
    //       language: { translate: t, locale: updatedBooking?.user?.locale ?? "en" },
    //     });
    //   }
    // }
    await handleWebhookTrigger({ subscriberOptions, eventTrigger, webhookData: updatedBooking });
    await sendDailyVideoRecordingEmails(evt, recordingLink);
  } catch (error) {
    console.error("Error in updateBookingRecordingLink:", error);
    throw new HttpCode({
      statusCode: 200,
      message: `Error in updateBookingRecordingLink`,
    });
  }
}
async function updateVideoDetailsMutation(videoId: string, description: string) {
  // Construct the GraphQL mutation input
  const input = {
    input: {
      videoId: videoId,
      externalSharingEnabled: true,
      description: description,
    },
  };

  // Define the GraphQL mutation
  const mutation = `
    mutation UpdateVideoDetails($input: UpdateVideoDetailsInput!) {
      updateVideoDetails(input: $input) {
        video {
          title
          description
          date
          visibility
          externalMeetingInstance {
            externalMeetingId
          }
          externalSharingEnabled
          url
        }
      }
    }
  `;

  try {
    // Execute the GraphQL mutation
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authToken, // Include your authentication token here
      },
      body: JSON.stringify({
        query: mutation,
        variables: input,
      }),
    });

    const responseData = await response.json();

    if (responseData.errors) {
      throw new Error(`GraphQL Error: ${responseData.errors[0].message}`);
    }

    const { url: recordingLink } = responseData?.data?.updateVideoDetails?.video;

    return recordingLink; // Return the recordingLink from the GraphQL response
  } catch (error) {
    console.error("Error in updateVideoDetailsMutation:", error);
    throw error;
  }
}

async function findBookingDescriptionByExternalMeetingId(externalMeetingId: string) {
  try {
    const bookingReference = await prisma.bookingReference.findFirst({
      where: {
        uid: externalMeetingId,
      },
      include: {
        booking: true, // Include the related booking
      },
    });

    if (bookingReference && bookingReference.booking) {
      const description = bookingReference.booking.description;

      const bookingId = bookingReference.booking.id;
      return { description, bookingId };
    }
    return { description: null, bookingId: null };
  } catch (error) {
    console.error("Error in findBookingDescriptionByExternalMeetingId:", error);
    throw error;
  }
}
async function processPayload(req: NextApiRequest) {
  try {
    const requestBuffer = await buffer(req);
    const payloadString = requestBuffer.toString();
    const payload = JSON.parse(payloadString);
    if (
      payload?.channel?.subdomain === process.env.REWATCH_SUBDOMAIN &&
      payload?.event === "video.addedToChannel" &&
      payload?.video
    ) {
      const { id: videoId, url: videoUrl, title: videoTitle } = payload.video;

      const data = await fetchVideoDetails(videoId);

      const externalMeetingId =
        data?.data?.channel?.videos?.nodes[0]?.externalMeetingInstance?.externalMeetingId;

      if (externalMeetingId) {
        // Retrieve description and bookingId from your data source or call appropriate functions.
        const { description, bookingId } = await findBookingDescriptionByExternalMeetingId(externalMeetingId);

        if (bookingId) {
          const recordingLink = await updateVideoDetailsMutation(videoId, description ? description : "");

          if (recordingLink) {
            await updateBookingRecordingLink(bookingId, recordingLink);
            throw new HttpCode({
              statusCode: 200,
              message: `Recording Successfully saved`,
            });
          }
        } else {
          throw new HttpCode({
            statusCode: 200,
            message: `Booking not found`,
          });
        }
      } else {
        throw new HttpCode({
          statusCode: 200,
          message: `ExternalMeeting id not found`,
        });
      }
    } else {
      throw new HttpCode({
        statusCode: 200,
        message: `Not allowed`,
      });
    }
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      throw new Error("Method Not Allowed");
    }

    const { headers } = req;
    const signatures = ((headers["rewatch-hook-delivery-signatures"] as string) || "").split(",");

    const hashes = SECRETS.map((secret) => {
      const dataToSign = [
        headers["rewatch-hook-id"],
        headers["rewatch-hook-delivery-event"],
        headers["rewatch-hook-delivery-nonce"],
        headers["rewatch-hook-delivery-timestamp"],
      ].join(";");

      const hmac = crypto.createHmac("sha256", secret);
      hmac.update(dataToSign);
      return hmac.digest("hex");
    });

    if (signatures.some((signature) => hashes.includes(signature))) {
      await processPayload(req);
    } else {
      throw new Error("Unhandled Rewatch Webhook event type");
    }
  } catch (err) {
    if (err instanceof Error) {
      console.error(`Webhook Error: ${err.message}`);
      res.status(err.statusCode ?? 500).json({
        message: err.message,
        stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
      });
      return;
    } else {
      console.error("Unknown error:", err);
      res.status(err.statusCode ?? 500).send({
        message: err.message,
        stack: IS_PRODUCTION ? undefined : err.stack,
      });
    }
    return;
  }

  // Return a response to acknowledge receipt of the event
  res.json({ received: true });
}
