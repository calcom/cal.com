import type { NextApiRequest } from "next";

import { getCalendar } from "@calcom/app-store/_utils/getCalendar";
import { OAuth2UniversalSchema } from "@calcom/app-store/_utils/oauth/universalSchema";
import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { symmetricDecrypt } from "@calcom/lib/crypto";
import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import { prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

import { schemaCredentialPostBody, schemaCredentialPostParams } from "~/lib/validations/credential-sync";

/**
 * @swagger
 * /credential-sync:
 *   post:
 *     operationId: createUserAppCredential
 *     summary: Create a credential record for a user
 *     parameters:
 *       - in: query
 *         name: apiKey
 *         required: true
 *         schema:
 *           type: string
 *         description: Your API key
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user to fetch the credentials for
 *     tags:
 *     - credentials
 *     requestBody:
 *       description: Create a new credential
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - encryptedKey
 *               - appSlug
 *             properties:
 *               encryptedKey:
 *                 type: string
 *               appSlug:
 *                type: string
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *        description: Authorization information is missing or invalid.
 *       505:
 *        description: Credential syncing not enabled
 */
async function handler(req: NextApiRequest) {
  if (!req.body) {
    throw new HttpError({ message: "Request body is missing", statusCode: 400 });
  }

  const { userId, createSelectedCalendar, createDestinationCalendar } = schemaCredentialPostParams.parse(
    req.query
  );

  const { appSlug, encryptedKey } = schemaCredentialPostBody.parse(req.body);

  const decryptedKey = JSON.parse(
    symmetricDecrypt(encryptedKey, process.env.CALCOM_APP_CREDENTIAL_ENCRYPTION_KEY || "")
  );

  const key = OAuth2UniversalSchema.parse(decryptedKey);

  // Need to get app type
  const app = await prisma.app.findUnique({
    where: { slug: appSlug },
    select: { dirName: true, categories: true },
  });

  if (!app) {
    throw new HttpError({ message: "App not found", statusCode: 500 });
  }

  const createCalendarResources =
    app.categories.some((category) => category === "calendar") &&
    (createSelectedCalendar || createDestinationCalendar);

  const appMetadata = appStoreMetadata[app.dirName as keyof typeof appStoreMetadata];

  const createdcredential = await prisma.credential.create({
    data: {
      userId,
      appId: appSlug,
      key: key as unknown as Prisma.InputJsonValue,
      type: appMetadata.type,
    },
    select: credentialForCalendarServiceSelect,
  });
  // createdcredential.user.email;
  // TODO:              ^ Investigate why this select doesn't work.
  const credential = await prisma.credential.findUniqueOrThrow({
    where: {
      id: createdcredential.id,
    },
    select: credentialForCalendarServiceSelect,
  });
  // ^ Workaround for the select in `create` not working

  if (createCalendarResources) {
    const calendar = await getCalendar({ ...credential, delegatedTo: null });
    if (!calendar) throw new HttpError({ message: "Calendar missing for credential", statusCode: 500 });
    const calendars = await calendar.listCalendars();
    const calendarToCreate = calendars.find((calendar) => calendar.primary) || calendars[0];

    if (createSelectedCalendar) {
      await prisma.selectedCalendar.createMany({
        data: [
          {
            userId,
            integration: appMetadata.type,
            externalId: calendarToCreate.externalId,
            credentialId: credential.id,
          },
        ],
        skipDuplicates: true,
      });
    }
    if (createDestinationCalendar) {
      await prisma.destinationCalendar.create({
        data: {
          integration: appMetadata.type,
          externalId: calendarToCreate.externalId,
          credential: { connect: { id: credential.id } },
          primaryEmail: calendarToCreate.email || credential.user?.email,
          user: { connect: { id: userId } },
        },
      });
    }
  }

  return { credential: { id: credential.id, type: credential.type } };
}

export default defaultResponder(handler);
