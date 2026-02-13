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

let inngestClient: InngestClient | null = null;

// /**
//  * Minimal interface matching the subset of the Inngest client we actually use.
//  * Avoids coupling to a specific Inngest SDK version.
//  */
// interface InngestClient {
//   send(payload: { name: string; data: unknown }): Promise<unknown>;
// }

/**
 * Resolve (or lazily create) the Inngest client.
 */
export function getInngestClient(): InngestClient {
  if (inngestClient) return inngestClient;
  try {
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
 * Inject a pre‑configured Inngest client (useful for testing or when the
 * host app already has one).
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
 * @returns The raw result from `inngestClient.send()`
 */
export async function sendToInngest(
  jobName: string,
  data: unknown,
  logger: DispatcherLogger
): Promise<InngestSendReturn> {
  const client = getInngestClient();
  const inngestJobName = `${jobName}-${INNGEST_ID === "onehash-cal" ? "prod" : "stag"}`;

  const result = await client.send({ name: inngestJobName, data });

  logger.info("[job-dispatcher] Job dispatched via Inngest", { jobName });
  return result;
}
