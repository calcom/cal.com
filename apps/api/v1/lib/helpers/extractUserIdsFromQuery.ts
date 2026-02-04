import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { schemaQuerySingleOrMultipleUserIds } from "~/lib/validations/shared/queryUserId";

/**
 * Extracts userIds from request query.
 * Only system wide admins can query other users.
 */
export function extractUserIdsFromQuery({ isSystemWideAdmin, query }: NextApiRequest) {
  if (!isSystemWideAdmin) {
    throw new HttpError({ statusCode: 401, message: "ADMIN required" });
  }

  const { userId: userIdOrUserIds } = schemaQuerySingleOrMultipleUserIds.parse(query);
  return Array.isArray(userIdOrUserIds) ? userIdOrUserIds : [userIdOrUserIds];
}
