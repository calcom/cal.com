import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import type { Booking } from "@calcom/prisma/client";

import sendEmail from "../../../utils/sendEmail";
import { verifyParseKey } from "../../../utils/verifyParseKey";

const dailyUrl = "https://api.daily.co/v1";

const requestJobSchema = z.object({
  id: z.string().min(1),
});
/** API Reference @link https://docs.daily.co/private/batch-processor/reference/submit-job */
const submitJob = async (
  recordingId: string,
  preset: "transcript" | "summarize"
): Promise<{ data: { jobId: string } | null; error: string | null }> => {
  const data = {
    preset: preset,
    inParams: { sourceType: "recordingId", recordingId: recordingId },
    outParams: { s3Config: { s3KeyTemplate: preset == "transcript" ? "transcript" : "summary" } },
  };
  try {
    const response = await fetch(`${dailyUrl}/batch-processor`, {
      headers: {
        "Content-type": "application/json",
        Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
      },
      method: "POST",
      body: JSON.stringify(data),
    });
    if (response.status == 200) {
      const { id } = requestJobSchema.parse(response.body);
      return { data: { jobId: id }, error: null };
    } else {
      return { data: null, error: "Could not request transcript" };
    }
  } catch {
    return { data: null, error: "Could not reach Daily API" };
  }
};
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export const POST = async (request: NextRequest) => {
  if (request.method === "OPTIONS") {
    return new NextResponse("ok", { headers: corsHeaders });
  }

  try {
    const verified = verifyParseKey(request.url);

    if (!verified) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const {
      recordingId,
      transcriptBody,
      booking,
      organizerEmail,
    }: { recordingId: string; transcriptBody: string; booking: Booking; organizerEmail: string } =
      await request.json();

    if (!transcriptBody || !booking || !organizerEmail) {
      return new NextResponse("No data received", { status: 400 });
    }
    //Approach 1 - send Transcript directly
    if (transcriptBody) {
      console.log(`transcript: ${transcriptBody}`);
      await sendEmail({
        subject: `Re: ${booking.title}`,
        text: `Thanks for using Cal.ai! Here's your transcript for the meeting`,
        to: organizerEmail, // TODO - do we want to send transcript to all attendees?
        from: "", //TODO ,
      });
    }

    //Approach 2 - use Batch Processor API
    if (recordingId) {
      const { data: transcriptJobId, error: transcriptError } = await submitJob(recordingId, "transcript");
      const { data: summaryJobId, error: summaryError } = await submitJob(recordingId, "summarize");
      //TODO add cron to check for job status
      /** API reference @link https://docs.daily.co/private/batch-processor/reference/get-job-access-link */
    }
    return new NextResponse("ok");
  } catch {
    return new NextResponse("Could not process the request", { status: 500 });
  }
};
