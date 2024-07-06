import short from "short-uuid";
import type { Logger } from "tslog";

import prisma from "@calcom/prisma";

const translator = short();
export const updateHashedLink = async ({
  organizerUserName,
  reqBodyStart,
  link,
  logger,
}: {
  organizerUserName?: string;
  reqBodyStart: string;
  link: string;
  logger: Logger<unknown>;
}) => {
  // Avoid passing referencesToCreate with id unique constrain values
  // refresh hashed link if used
  const urlSeed = `${organizerUserName}:${dayjs(reqBodyStart).utc().format()}`;
  const hashedUid = translator.fromUUID(uuidv5(urlSeed, uuidv5.URL));

  try {
    await prisma.hashedLink.update({
      where: {
        link,
      },
      data: {
        link: hashedUid,
      },
    });
  } catch (error) {
    logger.error("Error while updating hashed link", JSON.stringify({ error }));
  }
};
