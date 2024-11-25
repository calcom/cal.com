import type { DirectorySyncEvent } from "@boxyhq/saml-jackson";

import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";

const log = logger.getSubLogger({ prefix: ["getAttributesFromScimPayload"] });

type ScimUserAttributeName = string;
type ScimUserAttributeValue = string | string[];

function getAttributesFromScimPayload(
  event: DirectorySyncEvent
): Record<ScimUserAttributeName, ScimUserAttributeValue> {
  const scimUserAttributes: Record<ScimUserAttributeName, ScimUserAttributeValue> = {};

  if (event.event !== "user.created" && event.event !== "user.updated") {
    log.error("getAttributesFromScimPayload", `Unsupported event: ${event.event}`);
    return scimUserAttributes;
  }

  const raw = event.data.raw;
  raw.schemas.forEach((schema: unknown) => {
    if (schema === "urn:ietf:params:scim:schemas:core:2.0:User") {
      return;
    }
    const namespaceName = schema;
    if (typeof namespaceName !== "string") {
      log.error(
        "getAttributesFromScimPayload",
        `Namespace name is not a string ${safeStringify(namespaceName)}`
      );
      return;
    }
    const namespaceData = raw[namespaceName];
    if (!namespaceData) {
      log.warn("getAttributesFromScimPayload", `Namespace data for ${namespaceName} is null. Ignoring it.`);
      return;
    }

    Object.entries(namespaceData).forEach(([customAttributeName, value]) => {
      if (!value) {
        log.warn(
          "getAttributesFromScimPayload",
          `Custom attribute ${customAttributeName} is null. Ignoring it.`
        );
        return;
      }
      if (scimUserAttributes[customAttributeName]) {
        log.warn(
          "getAttributesFromScimPayload",
          `Custom attribute ${customAttributeName} already exists. Might be coming from different namespace. Ignoring it.`
        );
        return;
      }

      // FIXME: Support array of strings
      if (
        typeof value === "string" ||
        (value instanceof Array && value.every((item) => typeof item === "string"))
      ) {
        scimUserAttributes[customAttributeName] = value;
      }
    });
  });

  return scimUserAttributes;
}

export default getAttributesFromScimPayload;
