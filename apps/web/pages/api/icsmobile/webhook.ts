import type { NextApiRequest, NextApiResponse } from "next";

import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import logger from "@calcom/lib/logger";
import sendEmailWithNodeMailer from "@calcom/lib/sendEmailWithNodeMailer";
import prisma from "@calcom/prisma";
import { WorkflowStatus } from "@calcom/prisma/client";

const log = logger.getSubLogger({ prefix: ["api/webhook/icsmobile"] });

// Map ICSMobile statuses to workflow statuses
const statusMap = {
  DELIVERED: WorkflowStatus.DELIVERED,
  FAILED: WorkflowStatus.FAILED,
  SENT: WorkflowStatus.DELIVERED,
};

function normalizeStatusCode(statusCode: string): string {
  if (!statusCode.startsWith("Failed")) {
    return `Failed:${statusCode}`;
  }
  return statusCode;
}
export function getSmsStatusMessage(rawStatusCode: string): string {
  const statusCode = normalizeStatusCode(rawStatusCode);

  const smsStatusUserMessageMap: Record<string, string> = {
    "Failed:UERR": "The recipient device did not acknowledge the SMS.",

    "Failed:ILL": "Illegal subscriber. The mobile number is blocked by the operator.",

    "Failed:USTS": "The recipient handset did not respond.",

    "Failed:DND-DLT": "Message delivery failed due to DND preference or explicit content restrictions.",

    "Failed:PEID-DLT": "Sender ID and PE ID mismatch, inactive, blank, or blacklisted.",

    "Failed:TEMP-DLT":
      "DLT template issue: template not found, inactive, blacklisted, mismatched, invalid header, or variable length exceeded.",

    "Failed:ABS": "The subscriber is switched off, unreachable, or not available on the network.",

    "Failed:BL": "The mobile number is blacklisted.",

    "Failed:DND": "The mobile number is registered under DND and cannot receive this SMS.",

    "Failed:EXPIRED": "Message delivery expired after multiple retry attempts across operators.",

    "Failed:NETERR": "Network error occurred due to congestion, routing, signaling, or timeout issues.",

    "Failed:NERR": "Network error occurred due to congestion, routing, signaling, or timeout issues.",

    "Failed:USUB":
      "No directory number found for the subscriber or SMS service is barred due to LRN mapping.",

    "Failed:USB": "No directory number found for the subscriber or SMS service is barred due to LRN mapping.",

    "Failed:UNKNOWN": "Message failed due to an unknown or unusual network or handset issue.",

    "Failed:CAL-BARRED":
      "The mobile number is barred and cannot receive SMS due to billing or carrier restrictions.",

    "Failed:BRD":
      "The mobile number is barred and cannot receive SMS due to billing or carrier restrictions.",

    "Failed:MEM-EXCD": "The recipient handset does not have enough memory to receive the message.",

    "Failed:MERR": "The recipient handset does not have enough memory to receive the message.",

    "Failed:HANDSET-ERR": "Handset protocol error or no response from the recipient device.",

    "Failed:HFA": "Handset protocol error or unknown handset issue.",

    "Failed:FACILITY-ISSUE":
      "The number does not exist, the facility is unsupported, or content/sender is blocked by the operator.",

    "Failed:DLT-INV-PRM-TIME":
      "Promotional SMS was sent during a non-allowed time based on the subscriber’s DND preferences.",

    "Failed:OP-BLK": "The mobile number has been blacklisted at the operator level.",

    "Failed:SUB-REJECT":
      "SMS submission was rejected by the operator due to invalid source or destination address.",

    "Failed:SPAM": "SMS content or keywords are blacklisted due to spam or UCC complaints.",

    "Failed:CTA-URL-NF": "CTA link was not found in the message.",

    "Failed:CTA-NW": "CTA link is not whitelisted.",

    "Failed:UNDELIVRD": "Message could not be delivered due to a rare or newly observed failure.",
  };

  return (
    smsStatusUserMessageMap[statusCode] ?? "The message could not be delivered due to an unexpected issue."
  );
}

async function notifySmsDeliveryFailure({
  bookingUid,
  recipientNumber,
  smsText,
  sendAt,
  msgId,
  icsMsgRef,
  errorCode,
  errorStatusMsg,
}: {
  bookingUid: string | null;
  recipientNumber: string;
  smsText: string;
  sendAt: Date;
  msgId: string;
  icsMsgRef: string;
  errorCode?: string;
  errorStatusMsg?: string;
}): Promise<void> {
  const subject = `🚨Cal ID SMS Delivery Failed | Booking ${bookingUid}`;

  const body = `<div style="font-family: Arial, sans-serif; color: #333;">
      <h3 style="margin-bottom: 12px;">Cal ID SMS Delivery Failure Alert</h3>

      <p>An SMS delivery attempt has failed with the following details:</p>

      <table
        cellpadding="0"
        cellspacing="0"
        style="
          border-collapse: collapse;
          margin-top: 12px;
          width: 100%;
          max-width: 600px;
          border: 1px solid #d0d7de;
        "
      >
        <tr>
          <td style="padding: 8px 12px; font-weight: bold; border: 1px solid #d0d7de;">
            Booking UID
          </td>
          <td style="padding: 8px 12px; border: 1px solid #d0d7de;">
            ${bookingUid}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; font-weight: bold; border: 1px solid #d0d7de;">
            MSG UID
          </td>
          <td style="padding: 8px 12px; border: 1px solid #d0d7de;">
            ${msgId}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; font-weight: bold; border: 1px solid #d0d7de;">
            ICS MSGID
          </td>
          <td style="padding: 8px 12px; border: 1px solid #d0d7de;">
            ${icsMsgRef}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; font-weight: bold; border: 1px solid #d0d7de;">
            ICS Error Code
          </td>
          <td style="padding: 8px 12px; border: 1px solid #d0d7de;">
            ${errorCode}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; font-weight: bold; border: 1px solid #d0d7de;">
            ICS Error Description
          </td>
          <td style="padding: 8px 12px; border: 1px solid #d0d7de;">
            ${errorStatusMsg}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; font-weight: bold; border: 1px solid #d0d7de;">
            Recipient Number
          </td>
          <td style="padding: 8px 12px; border: 1px solid #d0d7de;">
            ${recipientNumber}
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 12px; font-weight: bold; border: 1px solid #d0d7de;">
            Scheduled Send Time (UTC)
          </td>
          <td style="padding: 8px 12px; border: 1px solid #d0d7de;">
            ${sendAt}
          </td>
        </tr>
      </table>

      <p style="margin-top: 16px; font-weight: bold;">SMS Content:</p>
      <pre style="
        background: #f6f8fa;
        padding: 12px;
        border-radius: 4px;
        border: 1px solid #d0d7de;
        white-space: pre-wrap;
        font-size: 13px;
      ">${smsText}</pre>

      <p style="margin-top: 16px; font-size: 12px; color: #666;">
        This is an automated system notification triggered from Cal ID under ICSMobile SMS status delivery webhook handler
      </p>
    </div>`;

  await sendEmailWithNodeMailer({
    to: "ics@cal.id",
    subject,
    body,
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { qStatus, qMobile, qMsgRef, qDTime, SMSMSGID, qNotes } = req.query;

    // Validate required parameters
    if (!SMSMSGID || !qStatus || !qMsgRef) {
      log.warn(`Webhook fields not found: SMSMSGID=${SMSMSGID}, qStatus=${qStatus}, qMsgRef=${qMsgRef}`);
      return res.status(400).json({ error: "Missing required fields (SMSMSGID or qStatus or qMsgRef)" });
    }

    // Extract values (query params can be string or string[])
    const msgId = Array.isArray(SMSMSGID) ? SMSMSGID[0] : SMSMSGID;
    const statusString = Array.isArray(qStatus) ? qStatus[0] : qStatus;
    const mobile = Array.isArray(qMobile) ? qMobile[0] : qMobile;
    const icsMsgRef = Array.isArray(qMsgRef) ? qMsgRef[0] : qMsgRef;
    const deliveryTime = Array.isArray(qDTime) ? qDTime[0] : qDTime;
    const notes = Array.isArray(qNotes) ? qNotes[0] : qNotes;

    // Normalize status
    const status = statusMap[statusString as keyof typeof statusMap];
    if (!status) {
      log.warn(`Unhandled status: ${statusString}`);
      return res.status(200).json({ error: "Status not handled" });
    }

    log.info("Processing ICSMobile webhook", {
      msgId,
      status: statusString,
      mobile,
      icsMsgRef,
      deliveryTime,
      notes,
    });

    // ONLY update existing workflow insights - never create new ones
    const existingInsight = await prisma.calIdWorkflowInsights.findFirst({
      where: {
        msgId: msgId,
        status: {
          not: WorkflowStatus.DELIVERED,
        },
      },
    });

    if (!existingInsight) {
      log.warn(`No existing workflow insight found for msgId ${msgId}, skipping update`);
      console.warn(`No existing workflow insight found for msgId ${msgId}, skipping update`);
      return res.status(200).json({ warning: "No existing insight found, skipped update" });
    }

    // Build metadata with all ICSMobile fields
    const metadata = {
      ...(existingInsight.metadata as object),
      icsMobile: {
        qStatus: statusString,
        qMobile: mobile,
        qMsgRef: icsMsgRef,
        qDTime: deliveryTime,
        qNotes: notes,
        updatedAt: new Date().toISOString(),
      },
    };

    await prisma.calIdWorkflowInsights.update({
      where: { msgId: msgId },
      data: {
        status: status,
        metadata: metadata,
      },
    });

    log.info("Successfully updated workflow insights for ICSMobile event", {
      msgId,
      status: statusString,
      normalizedStatus: status,
    });

    //in case of failure notify via mail
    if (status === WorkflowStatus.FAILED) {
      const meta = isPrismaObjOrUndefined(existingInsight.metadata);

      if (!meta) return;

      const { recipientNumber, smsText, sendAt } = meta as {
        recipientNumber?: string;
        smsText?: string;
        sendAt?: Date;
      };

      const errorStatusMsg = notes && getSmsStatusMessage(notes);

      try {
        await notifySmsDeliveryFailure({
          bookingUid: existingInsight.bookingUid,
          recipientNumber: recipientNumber!,
          smsText: smsText!,
          sendAt: sendAt!,
          msgId: msgId,
          icsMsgRef: icsMsgRef,
          errorCode: notes,
          errorStatusMsg: errorStatusMsg,
        });
      } catch (e) {
        log.error("Failed to notify sms delivery failure via email", {
          error: JSON.stringify(e),
        });
      }
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Error in /api/webhook/icsmobile", err);
    log.error("Error in /api/webhook/icsmobile", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
