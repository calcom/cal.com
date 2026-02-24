import { createBullWorkflowContext } from "@calid/job-dispatcher";
import { razorpayPaymentLinkPaidService } from "@calid/job-engine";
import type { RazorpayPaymentLinkPaidJobData } from "@calid/job-engine";
import type { Job } from "bullmq";

export async function processRazorpayPaymentLinkPaid(job: Job<RazorpayPaymentLinkPaidJobData>) {
  const ctx = createBullWorkflowContext(job);
  await razorpayPaymentLinkPaidService(ctx, job.data);
}
