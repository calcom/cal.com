"use client";

import type { ActionDefinition } from "@calcom/features/admin-dataview/types";

/**
 * Execute an admin action by calling the tRPC mutation via HTTP.
 *
 * Mutation paths in the registry are relative to `viewer.`, e.g.:
 *   "admin.lockUserAccount"  → POST /api/trpc/admin/lockUserAccount
 *   "users.delete"           → POST /api/trpc/users/delete
 *   "admin.watchlist.delete" → POST /api/trpc/admin/watchlist.delete
 *   "organizations.adminVerify" → POST /api/trpc/organizations/adminVerify
 *
 * The tRPC endpoint routing splits "viewer.X.Y.Z" into:
 *   endpoint = X, procedure = Y.Z, url = /api/trpc/X/Y.Z
 */
export async function executeAction(
  action: ActionDefinition,
  row: Record<string, unknown>
): Promise<unknown> {
  const input = action.buildInput(row);
  const parts = action.mutation.split(".");

  // First part is the endpoint (e.g. "admin", "users", "organizations")
  const endpoint = parts[0];
  // Rest is the procedure path (e.g. "lockUserAccount", "watchlist.delete")
  const procedure = parts.slice(1).join(".");

  const url = `/api/trpc/${endpoint}/${procedure}?batch=1`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    // tRPC batch format: body is { "0": { "json": <input> } }
    body: JSON.stringify({
      "0": { json: input },
    }),
  });

  const data = await response.json();

  // tRPC batch response format: [{ "result": { "data": { "json": ... } } }]
  if (Array.isArray(data)) {
    const result = data[0];
    if (result?.error) {
      const msg =
        result.error?.json?.message ??
        result.error?.message ??
        "Action failed";
      throw new Error(msg);
    }
    return result?.result?.data?.json ?? result?.result?.data;
  }

  if (!response.ok) {
    throw new Error(data?.error?.message ?? `Action failed (${response.status})`);
  }

  return data;
}
