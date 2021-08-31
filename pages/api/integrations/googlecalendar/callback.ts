import type { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@lib/auth";
import prisma from "../../../../lib/prisma";
import { google } from "googleapis";
//import { IntegrationCalendar, listCalendars } from "../../../../lib/calendarClient";
import { IntegrationAccount, getAccount } from "../../../../lib/externalAccountClient";

const credentials = process.env.GOOGLE_API_CREDENTIALS!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;

  // Check that user is authenticated
  const session = await getSession({ req: req });

  if (!session) {
    res.status(401).json({ message: "You must be logged in to do this" });
    return;
  }
  if (typeof code !== "string") {
    res.status(400).json({ message: "`code` must be a string" });
    return;
  }

  const { client_secret, client_id, redirect_uris } = JSON.parse(credentials).web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  const token = await oAuth2Client.getToken(code);
  const key = token.res?.data;
  const credentialsdata = {
    type: "google_calendar",
    key,
    userId: session.user.id,
  };
  // const primary_calendar_externalId: IntegrationCalendar[] = await listCalendars([credentialsdata])
  //       .then(function(results){
  //         return results.find((result) => result.primary).externalId;
  //       });

  const account: IntegrationAccount = await getAccount([credentialsdata]).then(function (result) {
    return result[0];
  });

  await prisma.credential.create({
    data: {
      type: "google_calendar",
      key,
      userId: session.user.id,
      externalAccount: {
        create: [
          {
            type: "google_account",
            userId: session.user.id,
            externalId: account.externalId,
            email: account.email,
            emailVerified: account.emailVerified,
            name: account.name,
            firstname: account.firstname,
            lastname: account.lastname,
            link: account.link,
            picture: account.picture,
            gender: account.gender,
            locale: account.locale,
            organizationDomain: account.organizationDomain,
          },
        ],
      },
    },
  });

  res.redirect("/integrations");
}
