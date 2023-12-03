// pages/api/chat.tsx
import { OpenAIStream, StreamingTextResponse } from "ai";
import type { NextRequest } from "next/server";
import { OpenAI } from "openai";
import type { ChatCompletionCreateParams } from "openai/resources/chat";
import { z } from "zod";

export const config = {
  runtime: "edge",
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export default async function Chat(req: NextRequest) {
  // Extract the `messages` from the body of the request
  const { messages, username, userId, userEventTypes, userTime, ...props } = await req.json();

  // eventTypes is a any[]

  const initialMessage = {
    content: `
    When being asked, mention what the user wanted to chat about, and you can help scheduling!!!! Do not reply with "Hello! How can I assist you today?"

    The current time is ${userTime}
    Your name is ${username}. You are the helping the user to schedule an event.
    You currently have the following event types in json: ${JSON.stringify(userEventTypes)}. 
    You will need to ask the user to provide the following information:
    - Date range
    - Time range

    Finally confirm the booking.

    MAKE SURE TO KEEP EVERYTHING SIMPLE, CONCISE and CLEAR, do not reply in a complicated way, and do not use too many words.
  `,
    role: "assistant",
  };

  console.log(initialMessage);

  // Request the OpenAI API for the response based on the prompt
  const response = await openai.chat.completions.create({
    model: "gpt-4-0613",
    stream: true,
    messages: messages != undefined ? [initialMessage, ...messages] : [initialMessage],
    max_tokens: 500,
    temperature: 0.7,
    top_p: 1,
    frequency_penalty: 1,
    presence_penalty: 1,
    functions,
  });

  // Convert the response into a friendly text-stream
  const stream = OpenAIStream(response, {
    experimental_onFunctionCall: async ({ name, arguments: args }, createFunctionCallMessages) => {
      // if you skip the function call and return nothing, the `function_call`
      // message will be sent to the client for it to handle
      switch (name) {
        case "get_user_availability":
          // Call a weather API here
          const { dateFrom, dateTo } = GetUserAvailability.parse(args);

          console.log("calling", dateFrom, dateTo, args);

          const data = await fetchAvailability({
            apiKey: process.env.CAL_API_KEY!,
            userId: userId,
            dateFrom: dateFrom,
            dateTo: dateTo,
          });

          console.log("User Availability", data);

          // `createFunctionCallMessages` constructs the relevant "assistant" and "function" messages for you
          const newMessages = createFunctionCallMessages(data as any);
          return openai.chat.completions.create({
            messages: [...messages, ...newMessages],
            stream: true,
            model: "gpt-4-0613",
            // see "Recursive Function Calls" below
            functions,
          });
        case "create_booking":
          const { end, eventTypeId, language, start, timeZone } = CreateBooking.parse(args);
          const booking = await createBooking({
            apiKey: process.env.CAL_API_KEY!,
            userId,
            user: {
              username: username,
              email: props.email,
            },
            eventTypeId,
            start,
            end,
            timeZone,
            language,
          });
          const bookingmessage = createFunctionCallMessages(booking as any);
          return openai.chat.completions.create({
            messages: [...messages, ...bookingmessage],
            stream: true,
            model: "gpt-4-0613",
            // see "Recursive Function Calls" below
            functions,
          });
        default:
          return;
      }
    },
  });

  // Respond with the stream
  return new StreamingTextResponse(stream);
  // return streamToResponse(stream);
}

const GetUserAvailability = z.object({
  dateFrom: z.string(),
  dateTo: z.string(),
  // eventTypeId: z.number(),
});

const CreateBooking = z.object({
  end: z.string().describe("This should correspond to the event type's length, unless otherwise specified."),
  eventTypeId: z.number(),
  language: z.string(),
  start: z.string(),
  status: z.string().optional().describe("ACCEPTED, PENDING, CANCELLED or REJECTED"),
  timeZone: z.string(),
  title: z.string().optional(),
});

const functions: ChatCompletionCreateParams.Function[] = [
  {
    name: "get_user_availability",
    description: "Get user availability by date range and event type.",
    parameters: {
      type: "object",
      properties: {
        dateFrom: {
          type: "string",
          description: "The start date of the range to check.",
        },
        dateTo: {
          type: "string",
          description: "The end date of the range to check.",
        },
        // eventTypeId: {
        //   type: "integer",
        //   description: "The event type ID to check.",
        // },
      },
      required: [
        "dateFrom",
        "dateTo",
        // "eventTypeId"
      ],
    },
  },
  {
    name: "create_booking",
    description: "Create a booking for the user.",
    parameters: {
      type: "object",
      properties: {
        end: {
          type: "string",
          description: "The end date of the range to check.",
        },
        eventTypeId: {
          type: "integer",
          description: "The event type ID to check.",
        },
        language: {
          type: "string",
          description: "The event type ID to check.",
        },
        start: {
          type: "string",
          description: "The event type ID to check.",
        },
        timeZone: {
          type: "string",
          description: "The event type ID to check.",
        },
        title: {
          type: "string",
          description: "The event type ID to check.",
        },
      },
      required: ["end", "eventTypeId", "language", "start", "timeZone", "title"],
    },
  },
];

export type Availability = {
  busy: {
    start: string;
    end: string;
    title?: string;
  }[];
  timeZone: string;
  dateRanges: {
    start: string;
    end: string;
  }[];
  workingHours: {
    days: number[];
    startTime: number;
    endTime: number;
    userId: number;
  }[];
  dateOverrides: {
    date: string;
    startTime: number;
    endTime: number;
    userId: number;
  };
  currentSeats: number;
};

export const fetchAvailability = async ({
  apiKey,
  userId,
  dateFrom,
  dateTo,
}: {
  apiKey: string;
  userId: number;
  dateFrom: string;
  dateTo: string;
}): Promise<Partial<Availability> | { error: string }> => {
  const params: { [k: string]: string } = {
    apiKey,
    userId: userId.toString(),
    dateFrom,
    dateTo,
  };

  const urlParams = new URLSearchParams(params);

  const url = `${process.env.BACKEND_URL}/availability?${urlParams.toString()}`;

  const response = await fetch(url);

  if (response.status === 401) throw new Error("Unauthorized");

  const data = await response.json();

  if (response.status !== 200) {
    return { error: data.message };
  }

  return {
    busy: data.busy,
    dateRanges: data.dateRanges,
    timeZone: data.timeZone,
    workingHours: data.workingHours,
  };
};

const createBooking = async ({
  apiKey,
  userId,
  user,
  eventTypeId,
  start,
  end,
  timeZone,
  language,
}: {
  apiKey: string;
  userId: number;
  user: {
    username: string;
    email: string;
  };
  eventTypeId: number;
  start: string;
  end: string;
  timeZone: string;
  language: string;
  title?: string;
  status?: string;
}): Promise<string | Error | { error: string }> => {
  const params = {
    apiKey,
    userId: userId.toString(),
  };

  const urlParams = new URLSearchParams(params);

  const url = `${process.env.BACKEND_URL}/bookings?${urlParams.toString()}`;

  const responses = {
    name: user.username,
    email: user.email,
  };

  const response = await fetch(url, {
    body: JSON.stringify({
      eventTypeId,
      start,
      end,
      responses,
      metadata: {},
      timeZone,
      language,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  // Let GPT handle this. This will happen when wrong event type id is used.
  // if (response.status === 401) throw new Error("Unauthorized");

  const data = await response.json();

  if (response.status !== 200) {
    return {
      error: data.message,
    };
  }

  return "Booking created";
};
