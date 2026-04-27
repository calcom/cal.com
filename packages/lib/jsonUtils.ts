import logger from "@calcom/lib/logger";

export const validJson = (jsonString: string) => {
  try {
    const o = JSON.parse(jsonString);
    if (o && typeof o === "object") {
      return o;
    }
  } catch (e) {
    logger.debug("Invalid JSON", e);
  }
  return false;
};
