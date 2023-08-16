import axios from "axios";
import crypto from "crypto";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { z } from "zod";

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
    super(message);
  }
}

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

const createSchema = z.object({
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

const joinSchema = z.object({
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
  // TODO: enable during debug
  // console.log(`[${config.method?.toUpperCase()}] ${config.url}`);
  return config;
});

// TODO: decide if this is needed
const handleAxiosErrors = (error: unknown) => {
  if (!axios.isAxiosError(error)) throw error;

  const { response, request } = error;
  if (response) {
    console.error(response);
  } else if (request) {
    console.error(request);
  } else {
    // pre-request error
    console.error("Unexpected error", error);
  }
};

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
    const hashThis = `${apiCallName}${url.searchParams.toString()}${this.options.secret}`;
    const checksum = crypto.createHash(this.options.hash).update(hashThis).digest("hex");
    url.searchParams.append("checksum", checksum);

    return url.toString();
  }

  private handleErrors(error: unknown) {
    console.error(error);
    if (error instanceof BbbError) {
      return {
        success: false,
        code: error.code,
        reason: errorDescriptions[error.code].replace("{MESSAGE}", error.message),
      } as const;
    }
    return { success: false, reason: "Internal server error." } as const;
  }

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

  async createMeeting(meetingId: string, meetingName: string) {
    const url = this.buildUrl(
      "create",
      new URLSearchParams({
        meetingID: meetingId,
        name: meetingName,
      })
    );
    try {
      const { data } = await instance.get(url);
      return { success: true, data: createSchema.parse(data) } as const;
    } catch (error) {
      return this.handleErrors(error);
    }
  }

  getSignedJoinMeetingUrl(meetingId: string, fullName: string, role: MeetingRole, redirect = true) {
    return this.buildUrl(
      "join",
      new URLSearchParams({
        fullName,
        meetingID: meetingId,
        redirect: redirect ? "true" : "false",
        role,
      })
    );
  }

  async joinMeeting(meetingId: string, fullName: string, role: MeetingRole, redirect = false) {
    const url = this.buildUrl(
      "join",
      new URLSearchParams({
        fullName,
        meetingID: meetingId,
        redirect: redirect ? "true" : "false",
        role,
        // disables cookie requirement - anyone can join with just the url we get in the reponse
        allowRequestsWithoutSession: "true",
      })
    );
    try {
      const { data } = await instance.get(url);
      return { success: true, data: joinSchema.parse(data) } as const;
    } catch (error) {
      return this.handleErrors(error);
    }
  }
}
