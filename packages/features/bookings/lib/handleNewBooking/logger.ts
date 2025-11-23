import logger from "@calcom/lib/logger";

export const createLoggerWithEventDetails = (
  eventTypeId: number,
  reqBodyUser: string | string[] | undefined,
  eventTypeSlug: string | undefined
) => {
  return logger.getSubLogger({
    prefix: ["book:user", `${eventTypeId}:${reqBodyUser}/${eventTypeSlug}`],
  });
};
