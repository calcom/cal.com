import { WebClient } from "@slack/web-api";
import dayjs from "@calcom/dayjs";
import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { WEBAPP_URL } from "@calcom/lib/constants";
import db from "@calcom/prisma";
import type { BookingCreateBody } from "@calcom/prisma/zod-utils";

import { WhereCredsEqualsId } from "../WhereCredsEqualsID";
import { getUserEmail } from "../utils";

export default async function createEvent(req: NextApiRequest, res: NextApiResponse) {
  const {
    user,
    view: {
      state: { values },
      id: view_id,
    },
    response_url,
  } = JSON.parse(req.body.payload);
  // This is a mess I have no idea why slack makes getting infomation this hard.
  const {
    eventName: {
      event_name: { value: selected_name },
    },
    eventType: {
      "create.event.type": {
        selected_option: { value: selected_event_id },
      },
    },
    selectedUsers: {
      invite_users: { selected_users },
    },
    eventDate: {
      event_date: { selected_date },
    },
    eventTime: {
      event_start_time: { selected_time },
    },
  } = values;

  // Im sure this query can be made more efficient... The JSON filtering wouldnt work when doing it directly on user.
  const foundUser = await db.credential
    .findFirst({
      rejectOnNotFound: true,
      ...WhereCredsEqualsId(user.id),
    })
    .user({
      select: {
        username: true,
        email: true,
        timeZone: true,
        locale: true,
        eventTypes: {
          where: {
            id: parseInt(selected_event_id),
          },
          select: {
            id: true,
            length: true,
            locations: true,
          },
        },
        credentials: {
          ...WhereCredsEqualsId(user.id),
        },
      },
    });

  const SlackCredentialsSchema = z.object({
    access_token: z.string(),
  });

  const slackCredentials = SlackCredentialsSchema.parse(foundUser?.credentials[0].key); // Only one slack credential for user

  const access_token = slackCredentials?.access_token;
  // https://api.slack.com/authentication/best-practices#verifying since we verify the request is coming from slack we can store the access_token in the DB.
  const client = new WebClient(access_token);
  // This could get a bit weird as there is a 3 second limit until the post times ou

  // Compute all users that have been selected and get their email.
  const invitedGuestsEmails = selected_users.map((userId: string) => getUserEmail(client, userId));

  const startDate = dayjs(`${selected_date} ${selected_time}`, "YYYY-MM-DD HH:mm");

  const PostData: BookingCreateBody = {
    start: dayjs(startDate).format(),
    end: dayjs(startDate)
      .add(foundUser?.eventTypes[0]?.length ?? 0, "minute")
      .format(),
    eventTypeId: foundUser?.eventTypes[0]?.id ?? 0,
    user: foundUser?.username ?? "",
    email: foundUser?.email ?? "",
    name: foundUser?.username ?? "",
    guests: await Promise.all(invitedGuestsEmails),
    location: "integrations:daily", // Defaulting to daily video to make this a bit more usefull than in-person
    timeZone: foundUser?.timeZone ?? "",
    language: foundUser?.locale ?? "en",
    customInputs: [{ label: "", value: "" }],
    metadata: {},
    notes: "This event was created with slack.",
  };

  const response = await fetch(`${WEBAPP_URL}/api/book/event`, {
    method: "POST",
    body: JSON.stringify(PostData),
    headers: {
      "Content-Type": "application/json",
    },
  });
  const body = await response.json();
  client.chat.postMessage({
    token: access_token,
    channel: user.id,
    text: body.errorCode ? `Error: ${body.errorCode}` : "Booking has been created.",
  });
  return res.status(200).send("");
}
