// import { dispatcher } from "@calid/job-dispatcher";
// import type { RazorpayAppRevokedJobData, RazorpayPaymentLinkPaidJobData } from "@calid/job-engine/types";
// import { QueueName, JobName } from "@calid/queue";

// import logger from "@calcom/lib/logger";

// const log = logger.getSubLogger({ prefix: ["[razorpay/webhookHandlers]"] });

// export const appRevokedHandler = async ({ event }: { event: { data: { accountId: string } } }) => {
//   const { accountId } = event.data;

//   log.info(`Dispatching APP_REVOKED job for account: ${accountId}`);

//   const payload: RazorpayAppRevokedJobData = { accountId };

//   const { jobId } = await dispatcher.dispatch({
//     queue: QueueName.DEFAULT,
//     name: JobName.RAZORPAY_APP_REVOKED,
//     data: payload,
//     options: {
//       attempts: 3,
//       backoff: {
//         type: "exponential",
//         delay: 3000,
//       },
//       removeOnComplete: {
//         age: 86400,
//         count: 100,
//       },
//       removeOnFail: {
//         age: 604800,
//         count: 1000,
//       },
//     },
//   });

//   log.info(`APP_REVOKED job dispatched with jobId: ${jobId} for account: ${accountId}`);
//   return { success: true, message: "App revoked job dispatched", jobId };
// };

// export const paymentLinkPaidHandler = async ({
//   event,
// }: {
//   event: { data: { paymentId: string; paymentLinkId: string } };
// }) => {
//   const { paymentId, paymentLinkId } = event.data;

//   if (!paymentId || !paymentLinkId) {
//     log.warn("Missing paymentId or paymentLinkId in payment link paid event");
//     return { success: false, message: "Missing required data" };
//   }

//   log.info(`Dispatching PAYMENT_LINK_PAID job for payment: ${paymentId}`);

//   const payload: RazorpayPaymentLinkPaidJobData = { paymentId, paymentLinkId };

//   const { jobId } = await dispatcher.dispatch({
//     queue: QueueName.DEFAULT,
//     name: JobName.RAZORPAY_PAYMENT_LINK_PAID,
//     data: payload,
//     options: {
//       attempts: 3,
//       backoff: {
//         type: "exponential",
//         delay: 3000,
//       },
//       removeOnComplete: {
//         age: 86400,
//         count: 100,
//       },
//       removeOnFail: {
//         age: 604800,
//         count: 1000,
//       },
//     },
//   });

//   log.info(`PAYMENT_LINK_PAID job dispatched with jobId: ${jobId} for payment: ${paymentId}`);
//   return { success: true, message: "Payment link paid job dispatched", jobId };
// };
