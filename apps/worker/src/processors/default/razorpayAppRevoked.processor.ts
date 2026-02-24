import { createBullWorkflowContext } from "@calid/job-dispatcher";
import { razorpayAppRevokedService } from "@calid/job-engine";
import type { RazorpayAppRevokedJobData } from "@calid/job-engine";
import type { Job } from "bullmq";

export async function processRazorpayAppRevoked(job: Job<RazorpayAppRevokedJobData>) {
  const ctx = createBullWorkflowContext(job);
  await razorpayAppRevokedService(ctx, job.data);
}
