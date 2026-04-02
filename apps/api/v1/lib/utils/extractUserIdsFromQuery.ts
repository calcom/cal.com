import { HttpError } from "@calcom/lib/http-error";
import type { NextApiRequest } from "next";
import { schemaQuerySingleOrMultipleUserIds } from "~/lib/validations/shared/queryUserId";

export function extractUserIdsFromQuery({ isSystemWideAdmin, query }: NextApiRequest) {
  /** Guard: Only admins can query other users */
  if (!isSystemWideAdmin) {
    throw new HttpError({ statusCode: 401, message: "ADMIN required" });
  }
  const { userId: userIdOrUserIds } = schemaQuerySingleOrMultipleUserIds.parse(query);
  return Array.isArray(userIdOrUserIds) ? userIdOrUserIds : [userIdOrUserIds];
}
