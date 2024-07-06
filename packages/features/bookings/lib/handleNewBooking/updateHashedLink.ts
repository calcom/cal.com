import short from "short-uuid";
import type { Logger } from "tslog";
import { v5 as uuidv5 } from "uuid";

import dayjs from "@calcom/dayjs";
import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";

const translator = short();
export const updateHashedLink = async ({
  organizerUserName,
  reqBodyStart,
  link,
  logger,
}: {
  organizerUserName: string | null;
  reqBodyStart: string;
  link?: string | null;
  logger: Logger<unknown>;
}) => {
  if (!link) throw new HttpError({ statusCode: 400, message: "Missing hashed link" });
  // Avoid passing referencesToCreate with id unique constrain values
  // refresh hashed link if used
  const urlSeed = `${organizerUserName}:${dayjs(reqBodyStart).utc().format()}`;
  const hashedUid = translator.fromUUID(uuidv5(urlSeed, uuidv5.URL));

  try {
    await prisma.hashedLink.update({
      where: {
        link: link,
      },
      data: {
        link: hashedUid,
      },
    });
  } catch (error) {
    logger.error("Error while updating hashed link", JSON.stringify({ error }));
  }
};
