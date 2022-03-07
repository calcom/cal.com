import { WebClient } from "@slack/web-api";
import dayjs from "dayjs";
import { NextApiRequest, NextApiResponse } from "next";

import { BASE_URL } from "@calcom/lib/constants";
import db from "@calcom/prisma";

import { WhereCredsEqualsId } from "../WhereCredsEqualsID";

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
    state: { values },
  } = JSON.parse(req.body.payload);

  // This is a mess I have no idea why slack makes getting infomation this hard.
  const {
    "/yDN": {
      event_name: { value: selected_name },
    },
    "r8/": {
      "create.event.type": {
        selected_option: { value: selected_event_id },
      },
    },
    J037A: {
      invite_users: { selected_users },
    },
    bt5Nc: {
      event_date: { selected_date },
    },
    pZP: {
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
      include: {
        eventTypes: {
          where: {
            id: parseInt(selected_event_id),
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

  const getUserEmail = async (userId: string) =>
    await (
      await client.users.info({ user: userId })
    ).user?.profile?.email;

  // Compute all users that have been selected and get their email.
  const invitedGuestsEmails = selected_users.map(async (userId: string) => await getUserEmail(userId));

  const PostData: BookingCreateBody = {
    start: dayjs(selected_date).format(),
    end: dayjs(selected_date)
      .add(foundUser?.eventTypes[0]?.length ?? 0, "minute")
      .format(),
    eventTypeId: foundUser?.eventTypes[0]?.id ?? 0,
    user: foundUser?.username ?? "",
    email: foundUser?.email ?? "",
    name: selected_name,
    guests: await Promise.all(invitedGuestsEmails),
    location: "inPerson",
    timeZone: foundUser?.timeZone ?? "",
    language: foundUser?.locale ?? "en",
    customInputs: [{ label: "", value: "" }],
    metadata: {},
  };

  // console.log(PostData);

  // Possible make the fetch_wrapped into a shared package?
  fetch(`${BASE_URL}/api/book/events`, {
    method: "POST",
    body: JSON.stringify(PostData),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  })
    .then((res) => res.json())
    .then((data) => console.log(data))
    .catch((error) => console.error({ error }));

  res.status(200).json("ok");
}
