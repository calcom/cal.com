import axios from "axios";
import crypto from "crypto";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { z } from "zod";

import logger from "@calcom/lib/logger";

const xmlParser = new XMLParser({
  ignoreDeclaration: true,
});

export type BbbErrorCode = "FAILED_REQUEST" | "INVALID_RESPONSE_SCHEMA" | "INVALID_CHECKSUM" | "INVALID_XML";

const errorDescriptions: Record<BbbErrorCode, string> = {
  FAILED_REQUEST: "Request failed with: {MESSAGE}",
  INVALID_RESPONSE_SCHEMA: "Invalid API response schema. Check server logs.",
  INVALID_CHECKSUM: "Invalid checksum. Wrong secret or unsupported hash type.",
  INVALID_XML: "Received invalid XML. Bad API endpoint?",
};

class BbbError extends Error {
  constructor(public code: BbbErrorCode, message?: string) {
    super(message ?? errorDescriptions[code]);
  }
}

const createParamsSchema = z
  .object({
    meetingID: z.string().min(1),
    name: z.string().min(1),
  })
  .strict();

const joinParamsSchema = z
  .object({
    fullName: z.string().min(1),
    meetingID: z.string().min(1),
    redirect: z.union([z.literal("true"), z.literal("false")]),
    role: z.union([z.literal("MODERATOR"), z.literal("VIEWER")]),
    allowRequestsWithoutSession: z.union([z.literal("true"), z.literal("false")]).optional(),
  })
  .strict();

const responseSchema = z.object({
  response: z.discriminatedUnion("returncode", [
    z.object({
      returncode: z.literal("FAILED"),
      messageKey: z.string(),
      message: z.string(),
    }),
    z
      .object({
        returncode: z.literal("SUCCESS"),
      })
      .passthrough(),
  ]),
});

const createResponseSchema = z.object({
  returncode: z.literal("SUCCESS"),
  meetingID: z.string(),
  internalMeetingID: z.string(),
  parentMeetingID: z.string(),
  attendeePW: z.string(),
  moderatorPW: z.string(),
  createTime: z.number(),
  voiceBridge: z.number(),
  dialNumber: z.number(),
  createDate: z.coerce.date(),
  hasUserJoined: z.boolean(),
  duration: z.number(),
  hasBeenForciblyEnded: z.boolean(),
  messageKey: z.string(),
  message: z.string(),
});

const joinResponseSchema = z.object({
  returncode: z.literal("SUCCESS"),
  messageKey: z.string(),
  message: z.string(),
  meeting_id: z.string(),
  user_id: z.string(),
  auth_token: z.string(),
  session_token: z.string(),
  guestStatus: z.string(),
  url: z.string().url(),
});

const instance = axios.create({
  timeout: 10_000,
  transformResponse: [
    (data) => {
      const isValidXml = XMLValidator.validate(data);
      if (isValidXml !== true) {
        throw new BbbError("INVALID_XML", isValidXml.err.msg);
      }
      const parsed = xmlParser.parse(data);
      const bbbResponse = responseSchema.safeParse(parsed);
      if (!bbbResponse.success) {
        throw new BbbError("INVALID_RESPONSE_SCHEMA");
      }

      // see: https://docs.bigbluebutton.org/development/api#error-handling
      const { response } = bbbResponse.data;
      if (response.returncode !== "FAILED") return response;

      if (response.messageKey === "checksumError") {
        throw new BbbError("INVALID_CHECKSUM");
      } else {
        throw new BbbError("FAILED_REQUEST", `(${response.messageKey}) ${response.message} `);
      }
    },
  ],
});
instance.interceptors.request.use((config) => {
  logger.debug(`[${config.method?.toUpperCase()}] ${config.url}`);
  return config;
});

type MeetingRole = "MODERATOR" | "VIEWER";

export const bbbOptionsSchema = z
  .object({
    url: z.string().url(),
    secret: z.string(),
    hash: z.enum(["sha1", "sha256", "sha384", "sha512"]),
  })
  .strict();

export type BbbOptions = z.infer<typeof bbbOptionsSchema>;

export class BbbApi {
  constructor(private options: BbbOptions) {}

  private buildUrl(apiCallName: string, searchParams: URLSearchParams) {
    const url = new URL(
      apiCallName,
      // ensure correct base for relative API call names
      this.options.url.endsWith("/") ? this.options.url : `${this.options.url}/`
    );
    url.search = searchParams.toString();

    // sign request
    // see: https://docs.bigbluebutton.org/development/api#usage
    const hashThis = `${apiCallName}${url.searchParams.toString()}${this.options.secret}`;
    const checksum = crypto.createHash(this.options.hash).update(hashThis).digest("hex");
    url.searchParams.append("checksum", checksum);

    return url.toString();
  }

  private handleErrors(error: unknown) {
    logger.error(error);
    if (error instanceof BbbError) {
      return {
        success: false,
        code: error.code,
        reason: errorDescriptions[error.code].replace("{MESSAGE}", error.message),
      } as const;
    }
    return { success: false, reason: "Internal server error." } as const;
  }

  // see: https://docs.bigbluebutton.org/development/api#getmeetinginfo
  async checkCredentials() {
    try {
      await instance.get(this.buildUrl("getMeetingInfo", new URLSearchParams()));
    } catch (error) {
      const withError = this.handleErrors(error);
      if (withError.code !== "FAILED_REQUEST") {
        return withError;
      }
      // BBB accepted our checksum, so the credentials are valid
    }
    return { success: true, data: null } as const;
  }

  // see: https://docs.bigbluebutton.org/development/api#create
  async createMeeting(meetingId: string, meetingName: string) {
    try {
      const params = createParamsSchema.parse({
        meetingID: meetingId,
        name: meetingName,
      });
      const { data } = await instance.get(this.buildUrl("create", new URLSearchParams(params)));
      return { success: true, data: createResponseSchema.parse(data) } as const;
    } catch (error) {
      return this.handleErrors(error);
    }
  }

  // see: https://docs.bigbluebutton.org/development/api#join
  getSignedJoinMeetingUrl(meetingId: string, fullName: string, role: MeetingRole, redirect = true) {
    const params = joinParamsSchema.parse({
      fullName: fullName,
      meetingID: meetingId,
      redirect: String(redirect),
      role,
    });
    return this.buildUrl("join", new URLSearchParams(params));
  }

  // see: https://docs.bigbluebutton.org/development/api#join
  async joinMeeting(meetingId: string, fullName: string, role: MeetingRole, redirect = false) {
    try {
      const params = joinParamsSchema.parse({
        fullName: fullName,
        meetingID: meetingId,
        redirect: String(redirect),
        role,
        // disables cookie requirement - anyone can join with just the url we get in the reponse
        allowRequestsWithoutSession: "true",
      });
      const { data } = await instance.get(this.buildUrl("join", new URLSearchParams(params)));
      return { success: true, data: joinResponseSchema.parse(data) } as const;
    } catch (error) {
      return this.handleErrors(error);
    }
  }
}
