import type { DirectorySyncEvent } from "@boxyhq/saml-jackson";

import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

const log = logger.getSubLogger({ prefix: ["getAttributesFromScimPayload"] });

function getAttributesFromScimPayload(event: DirectorySyncEvent) {
  const customAttributes: Record<string, string> = {};

  if (event.event !== "user.created" && event.event !== "user.updated") {
    log.error("getCustomAttributes", `Unsupported event: ${event.event}`);
    return customAttributes;
  }

  const raw = event.data.raw;
  raw.schemas.forEach((schema: unknown) => {
    if (schema === "urn:ietf:params:scim:schemas:core:2.0:User") {
      return;
    }
    const namespaceName = schema;
    if (typeof namespaceName !== "string") {
      log.error("getCustomAttributes", `Namespace name is not a string ${safeStringify(namespaceName)}`);
      return;
    }
    const namespaceData = raw[namespaceName];
    if (!namespaceData) {
      log.warn("getCustomAttributes", `Namespace data for ${namespaceName} is null. Ignoring it.`);
      return;
    }

    Object.entries(namespaceData).forEach(([customAttributeName, value]) => {
      if (!value) {
        log.warn("getCustomAttributes", `Custom attribute ${customAttributeName} is null. Ignoring it.`);
        return;
      }
      if (customAttributes[customAttributeName]) {
        log.warn(
          "getCustomAttributes",
          `Custom attribute ${customAttributeName} already exists. Might be coming from different namespace. Ignoring it.`
        );
        return;
      }

      // FIXME: Support array of strings
      if (typeof value === "string") {
        customAttributes[customAttributeName] = value;
      }
    });
  });

  return customAttributes;
}

export default getAttributesFromScimPayload;
