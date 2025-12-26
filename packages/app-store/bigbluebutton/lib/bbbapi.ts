import { createHash } from "crypto";
import { XMLParser, XMLValidator } from "fast-xml-parser";

import logger from "@calcom/lib/logger";

import type { bbbOptions, Role, GuestPolicy } from "./types";
import {
  Action,
  bbbJoinMeetingSchema,
  bbbCreateMeetingResponseSchema,
  bbbCreateMeetingSchema,
  bbbErrorMessages,
  bbbError,
  bbbBasicResponseSchema,
  bbbInstanceInfoSchema,
  bbbJoinMeetingResponseSchema,
} from "./types";

const log = logger.getSubLogger({ prefix: ["app-store/bigbluebutton/lib/bbbapi"] });
const MIN_API_VERSION = 2;

const xmlParser = new XMLParser({
  ignoreDeclaration: true, // there's no <?xml blah blah> stuff in the responses
});

/// This is a helper function to parse the XML response from the BBB API. Also gives a nice error message when wanted.
const withFetch = async (url: string, init?: RequestInit | undefined) => {
  const response = await fetch(url, init).catch((_err) => {
    throw new BBBError(bbbError.CANNOT_REACH_SERVER);
  });

  if (!response.ok) throw new BBBError(bbbError.CANNOT_REACH_SERVER);

  const responseBody = await response.text();

  const valid = XMLValidator.validate(responseBody);
  if (!valid) {
    throw new BBBError(bbbError.INVALID_XML_FORMAT);
  }

  const parsed = xmlParser.parse(responseBody);
  const schema = bbbBasicResponseSchema.safeParse(parsed);
  if (!schema.success) {
    throw new BBBError(bbbError.INVALID_XML_FORMAT);
  }

  if (schema.data.response.returncode === "SUCCESS") return schema.data.response;

  if (schema.data.response.messageKey === "checksumError") {
    throw new BBBError(bbbError.INVALID_CHECKSUM);
  } else {
    // log.info(`[BBB] unhandled error from server: ${JSON.stringify(schema.data.response)}`);
    throw new BBBError(bbbError.INVALID_XML_FORMAT);
  }
};

class BBBError extends Error {
  constructor(public error: bbbError, message?: string) {
    super(message ?? bbbErrorMessages[error]);
  }

  beautify() {
    return {
      error: this.error,
      message: this.message,
    } as const;
  }
}
// The BBB API is a bit quirky about accepting either GET or POST requests. I'll just use the GET requests, simple.
// The API expects a GET request with the checksum appended to the URL params.
export class BBBApi {
  constructor(private options: bbbOptions) {}

  private handleError(err: unknown) {
    if (err instanceof BBBError)
      return {
        success: false,
        ...err.beautify(),
      } as const;

    return { success: false, message: "Internal Server Error" } as const;
  }

  /// Creates a URL with the checksum appended to the URL params.
  createUrl(action: Action, params: URLSearchParams): string {
    // api call + params(without any spaces) + shared secret (the actual secret) into the pot to create the sha-? hash
    const to_hash = `${action.toString()}${params.toString().trim()}${this.options.secret}`;
    const checksum = createHash(this.options.hash).update(to_hash).digest("hex");

    const url = new URL(
      action.toString(),
      this.options.url.endsWith("/") ? this.options.url : `${this.options.url}/`
    );
    url.search = params.toString().trim();
    url.searchParams.append("checksum", checksum);

    return url.toString();
  }

  // ...api/create?meetingID=random-6970858&name=random-6970858&welcome=(url encoded string and optional)
  /// Creates a meeting by the given meeting id, meeting name and optional guest policy.
  async createMeeting(meetingId: string, meetingName: string, guestPolicy?: GuestPolicy) {
    try {
      const schema = bbbCreateMeetingSchema.parse({
        meetingID: meetingId,
        name: meetingName,
        guestPolicy,
      });
      const workaround = JSON.parse(JSON.stringify(schema)); // workaround for having undefined values
      const params = new URLSearchParams(workaround);

      const url = this.createUrl(Action.CREATE, params);

      const data = await withFetch(url, { method: "GET" });
      const dataSchema = bbbCreateMeetingResponseSchema.safeParse(data);
      if (!dataSchema.success) throw new BBBError(bbbError.INVALID_XML_FORMAT); // redundant?

      return {
        success: true,
        data: dataSchema.data,
      };
    } catch (err) {
      log.error(`[BBB] failed creating meeting: ${err}`);
      return this.handleError(err);
    }
  }

  // ...api/join?fullName=User+5746504&meetingID=random-6970858&redirect=true&role=MODERATOR
  // ...api/join?fullName=User+5746504&meetingID=random-6970858&redirect=true&role=ATTENDEE
  /// Joins a meeting by the given meeting id, name and role.
  async joinMeeting(meetingId: string, name: string, role: Role) {
    try {
      const schema = bbbJoinMeetingSchema.parse({
        meetingID: meetingId,
        fullName: name,
        role,
      });
      const workaround = JSON.parse(JSON.stringify(schema)); // workaround for having undefined values
      const params = new URLSearchParams(workaround);

      const url = this.createUrl(Action.JOIN, params);

      const data = await withFetch(url, { method: "GET" });
      const dataSchema = bbbJoinMeetingResponseSchema.safeParse(data);
      if (!dataSchema.success) throw new BBBError(bbbError.INVALID_XML_FORMAT); // redundant?

      return {
        success: true,
        data: dataSchema.data,
      };
    } catch (err) {
      log.error(`[BBB] failed joining meeting: ${err}`);
      return this.handleError(err);
    }
  }

  /// Checks if the options (the secret) are valid.
  async checkValidOptions() {
    const isInstanceValid = await this.validateInstanceInfo();
    if (!isInstanceValid) return false;

    const isChecksumValid = await this.validateChecksum();
    return isChecksumValid;
  }

  private async validateInstanceInfo() {
    try {
      const url = this.createUrl(Action.INSTANCE_INFO, new URLSearchParams());
      const data = await withFetch(url, { method: "GET" });

      const dataSchema = bbbInstanceInfoSchema.safeParse(data);
      if (!dataSchema.success) {
        return false;
      }

      return parseFloat(dataSchema.data.apiVersion) >= MIN_API_VERSION;
    } catch (err) {
      log.info(`[BBB] failed to validate instance info:`, err);
      return false;
    }
  }

  private async validateChecksum() {
    try {
      const url = this.createUrl(Action.CREATE, new URLSearchParams());
      await withFetch(url, { method: "GET" });
      return true;
    } catch (err) {
      if (err instanceof BBBError) {
        if (err.error === bbbError.INVALID_CHECKSUM) {
          log.info(`[BBB] invalid configuration options`);
          return false;
        }
        // Network errors mean we can't verify - propagate them
        if (err.error === bbbError.CANNOT_REACH_SERVER) {
          throw err;
        }
      }
      // Other errors (like invalid XML) mean server responded, so checksum was valid
      return true;
    }
  }
}
