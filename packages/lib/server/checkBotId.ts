import { checkBotId as vercelCheckBotId } from "botid/server";

import { NEXT_PUBLIC_BOTID_ENABLED } from "../constants";
import { HttpError } from "../http-error";

export async function checkBotId() {
  if (process.env.NEXT_PUBLIC_IS_E2E) {
    return {
      isHuman: true,
      isBot: false,
      isGoodBot: false,
      bypassed: true,
    };
  }

  if (!NEXT_PUBLIC_BOTID_ENABLED || NEXT_PUBLIC_BOTID_ENABLED !== "1") {
    return {
      isHuman: true,
      isBot: false,
      isGoodBot: false,
      bypassed: true,
    };
  }

  try {
    const result = await vercelCheckBotId();

    if (result.isBot && !result.isGoodBot) {
      throw new HttpError({
        statusCode: 401,
        message: "Bot access not allowed",
      });
    }

    return result;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError({
      statusCode: 401,
      message: "Bot verification failed",
    });
  }
}
