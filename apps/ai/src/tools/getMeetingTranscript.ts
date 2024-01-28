import { loadSummarizationChain } from "langchain/chains";
import { OpenAI } from "langchain/llms/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

import type { VideoMeetingInfo } from "@calcom/web/pages/video/[uid]";

import sendEmail from "../utils/sendEmail";

const sendFullTrancript = (booking: VideoMeetingInfo["booking"], transcript: string) => {
  if (!booking.user?.email) {
    return;
  }
  sendEmail({
    html: `Here's the full transcript for your meeting with ${booking.attendees}`,
    subject: `Meeting Transcript for ${booking.title}`,
    text: transcript,
    to: booking.user?.email,
    from: `${booking.user?.email.split("@")[0]}@cal.ai`,
  });
};

const generateTranscriptSummary = async (booking: VideoMeetingInfo["booking"], transcript: string) => {
  if (!booking.user?.email) {
    return;
  }
  //Generate summary with langchain

  const model = new OpenAI({ temperature: 0 });
  const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000 });
  const docs = await textSplitter.createDocuments([transcript]);

  // This convenience function creates a document chain prompted to summarize a set of documents.
  const chain = loadSummarizationChain(model, { type: "map_reduce" });
  const res = await chain.call({
    input_documents: docs,
  });
  //send summary
  sendEmail({
    html: `Here's the summary of the transcript for your meeting with ${booking.attendees}\n\n Transcript summary: ${res.text}`,
    subject: `Meeting Transcript for ${booking.title}`,
    text: transcript,
    to: booking.user?.email,
    from: `${booking.user?.email.split("@")[0]}@cal.ai`,
  });
};
const getMeetingTranscript = async (
  apiKey: string,
  booking: VideoMeetingInfo["booking"],
  transcript: string
) => {
  console.log(
    `Inside getMeetingTranscript\n apiKey:${apiKey} booking:${JSON.stringify(
      booking
    )} transcript:${transcript}`
  );
  sendFullTrancript(booking, transcript);
  //send second email with summary generated using langchain
  return;
};

export default getMeetingTranscript;
