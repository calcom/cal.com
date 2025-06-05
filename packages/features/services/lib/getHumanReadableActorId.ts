import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

import { doesServiceIdExist, getServiceName } from "../services";

const log = logger.getSubLogger({ prefix: ["getHumanReadableActorId"] });

/**
 * It accepts a regular user email or a serviceId and ensures that serviceId isn't shown to the user.
 */
export const getHumanReadableActorId = (serviceIdOrUserEmail: string) => {
  if (doesServiceIdExist(serviceIdOrUserEmail)) {
    const serviceName = getServiceName(serviceIdOrUserEmail);
    if (!serviceName) {
      log.error("Unknown serviceId", safeStringify({ serviceIdOrUserEmail }));
      return serviceIdOrUserEmail;
    }
    return serviceName;
  }
  const userEmail = serviceIdOrUserEmail;
  return userEmail;
};
