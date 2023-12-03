// pages/api/chat.tsx
import { OpenAIStream, StreamingTextResponse } from "ai";
import type { NextRequest } from "next/server";
import { OpenAI } from "openai";

export const config = {
  runtime: "edge",
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export default async function Chat(req: NextRequest) {
  // Extract the `messages` from the body of the request
  const { messages } = await req.json();

  console.log(messages);

  // Request the OpenAI API for the response based on the prompt
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    stream: true,
    messages: messages,
    max_tokens: 500,
    temperature: 0.7,
    top_p: 1,
    frequency_penalty: 1,
    presence_penalty: 1,
  });

  // Convert the response into a friendly text-stream
  const stream = OpenAIStream(response);

  // Respond with the stream
  return new StreamingTextResponse(stream);
}
