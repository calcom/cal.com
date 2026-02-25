// import { createBullWorkflowContext, SleepSignal } from "@calid/job-dispatcher";
// import {
//   syncWhatsappTemplatesService,
//   WhatsAppSyncError,
//   WhatsAppTokenExpiredError,
//   WhatsAppTokenMissingError,
//   type SyncWhatsappTemplatesData,
//   type SyncWhatsappTemplatesResult,
// } from "@calid/job-engine";
// import type { Job } from "bullmq";
// import { UnrecoverableError } from "bullmq";

// import logger from "@calcom/lib/logger";
// import { prisma } from "@calcom/prisma";

// const log = logger.getSubLogger({ prefix: ["[processor:sync-whatsapp-templates]"] });

// export async function syncWhatsappTemplatesProcessor(
//   job: Job<SyncWhatsappTemplatesData>
// ): Promise<SyncWhatsappTemplatesResult> {
//   log.info("Processing WhatsApp template sync", {
//     jobId: job.id,
//     attemptsMade: job.attemptsMade,
//   });

//   // Create workflow context from BullMQ job
//   const ctx = createBullWorkflowContext(job);

//   try {
//     const result = await syncWhatsappTemplatesService(job.data, prisma, ctx);

//     log.info("WhatsApp template sync completed", {
//       jobId: job.id,
//       totalPhones: result.totalPhones,
//       successCount: result.successCount,
//       failureCount: result.failureCount,
//     });

//     return result;
//   } catch (error) {
//     // ── Handle ctx sleep signal ──────────────────────────────────────
//     if (error instanceof SleepSignal) {
//       log.info("Job sleeping, will resume after delay", {
//         jobId: job.id,
//         duration: error.duration,
//       });
//       throw error;
//     }

//     // ── Token errors are permanent (don't retry, alert user) ─────────────
//     if (error instanceof WhatsAppTokenExpiredError || error instanceof WhatsAppTokenMissingError) {
//       log.error("WhatsApp token error, marking as unrecoverable", {
//         jobId: job.id,
//         error: error.message,
//       });
//       // Don't retry - user needs to reconnect integration
//       throw new UnrecoverableError(error.message);
//     }

//     // ── Sync errors are transient (retry with backoff) ───────────────────
//     if (error instanceof WhatsAppSyncError) {
//       log.warn("WhatsApp sync error, will retry", {
//         jobId: job.id,
//         attempt: job.attemptsMade,
//         error: error.message,
//       });
//       throw error;
//     }

//     // ── Unexpected errors ─────────────────────────────────────────────────
//     log.error("Unexpected error in WhatsApp template sync", {
//       jobId: job.id,
//       error: error instanceof Error ? error.message : String(error),
//     });
//     throw error; // Retry unexpected errors
//   }
// }
