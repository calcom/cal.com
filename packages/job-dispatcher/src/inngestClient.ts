import { Inngest } from "inngest";

import { INNGEST_ID } from "@calcom/lib/constants";

import type { DispatcherLogger, InngestSendReturn } from "./types";

export type InngestClient = InstanceType<
  typeof Inngest<{
    id: string;
    eventKey: string;
  }>
>;

// ---------------------------------------------------------------------------
// Inngest client singleton
// ---------------------------------------------------------------------------
// We lazily import Inngest so the package doesn't hard‑crash if inngest is
// not installed (e.g. after full migration).  The client is created once and
// reused for the lifetime of the process.
// ---------------------------------------------------------------------------

let inngestClient: InngestClient | null = null;

// /**
//  * Minimal interface matching the subset of the Inngest client we actually use.
//  * This avoids coupling the package to a specific Inngest SDK version.
//  */
// interface InngestClient {
//   send(payload: { name: string; data: unknown }): Promise<unknown>;
// }

/**
 * Resolve (or lazily create) the Inngest client.
 *
 * The function first checks whether an explicit client was provided via
 * `setInngestClient`.  If not, it dynamically imports the `inngest` package
 * and instantiates a client using `INNGEST_EVENT_KEY` from the environment.
 */
export function getInngestClient(): InngestClient {
  if (inngestClient) return inngestClient;
  try {
    // Dynamic import so the dep is optional at runtime
    inngestClient = new Inngest({
      id: INNGEST_ID,
      eventKey: process.env.INNGEST_EVENT_KEY || "",
    });
    return inngestClient;
  } catch {
    throw new Error(
      "[job-dispatcher] Failed to import inngest. " +
        "Make sure the `inngest` package is installed when using the Inngest fallback."
    );
  }
}

/**
 * Allow injecting a pre‑configured Inngest client (useful for testing or
 * when the host app already has one).
 */
export function setInngestClient(client: InngestClient): void {
  inngestClient = client;
}

// ---------------------------------------------------------------------------
// Public send helper
// ---------------------------------------------------------------------------

/**
 * Send a job event to Inngest.
 *
 * @param jobName  Canonical job name (`queue/name`)
 * @param data     JSON payload
 * @param logger   Logger instance
 */
export async function sendToInngest(
  jobName: string,
  data: unknown,
  logger: DispatcherLogger
): Promise<InngestSendReturn> {
  const client = getInngestClient();

  const result = await client.send({ name: jobName, data });

  logger.info("[job-dispatcher] Job dispatched via Inngest", {
    jobName,
  });
  return result;
}
