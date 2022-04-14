import { WebClient } from "@slack/web-api";
import dayjs from "dayjs";
import { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL } from "@calcom/lib/constants";
import db from "@calcom/prisma";

import { WhereCredsEqualsId } from "../WhereCredsEqualsID";
import { getUserEmail } from "../utils";
import BookingSuccess from "../views/BookingSuccess";

// TODO: Move this type to a shared location - being used in more than one package.
export type BookingCreateBody = {
  email: string;
  end: string;
  web3Details?: {
    userWallet: string;
    userSignature: unknown;
  };
  eventTypeId: number;
  guests?: string[];
  location: string;
  name: string;
  notes?: string;
  rescheduleUid?: string;
  start: string;
  timeZone: string;
  user?: string | string[];
  language: string;
  customInputs: { label: string; value: string }[];
  metadata: {
    [key: string]: string;
  };
};

export default async function createEvent(req: NextApiRequest, res: NextApiResponse) {
  const {
    user,
    view: {
      state: { values },
    },
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

  const slackCredentials = foundUser?.credentials[0].key; // Only one slack credential for user

  // @ts-ignore access_token must exist on slackCredentials otherwise we have wouldnt have reached this endpoint

  const access_token = slackCredentials?.access_token;
  // https://api.slack.com/authentication/best-practices#verifying since we verify the request is coming from slack we can store the access_token in the DB.
  const client = new WebClient(access_token);
  // This could get a bit weird as there is a 3 second limit until the post times ou

  // Compute all users that have been selected and get their email.
  const invitedGuestsEmails = selected_users.map(
    async (userId: string) => await getUserEmail(client, userId)
  );

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

  if (startDate < dayjs()) {
    client.chat.postMessage({
      token: access_token,
      channel: user.id,
      text: `Error: Day must not be in the past`,
    });
    return res.status(200).send("");
  }

  fetch(`${WEBAPP_URL}/api/book/event`, {
    method: "POST",
    body: JSON.stringify(PostData),
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then(() => {
      client.chat.postMessage({
        token: access_token,
        channel: user.id, // We just dm the user here as there is no point posting this message publicly - In future it might be worth pinging all the members of the invite also?
        text: "Booking has been created.",
      });
      return res.status(200).send(""); // Slack requires a 200 to be sent to clear the modal. This makes it massive pain to update the user that the event has been created.
    })
    .catch((e) => {
      client.chat.postMessage({
        token: access_token,
        channel: user.id,
        text: `Error: ${e}`,
      });
      return res.status(200).send("");
    });
}
