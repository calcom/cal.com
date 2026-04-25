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
  ignoreDeclaration: true,
});

const withFetch = async (url: string, init?: RequestInit | undefined) => {
  const response = await fetch(url, init).catch((err) => {
    log.warn(`[BBB] fetch failed: ${err}`);
    throw new BBBError(bbbError.CANNOT_REACH_SERVER);
  });

  if (!response.ok) {
    log.warn(`[BBB] non-OK response: ${response.status} ${response.statusText}`);
    throw new BBBError(bbbError.SERVER_ERROR, `HTTP ${response.status}`);
  }

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
    const serverMessage = schema.data.response.message;
    log.warn(
      `[BBB] server error: ${schema.data.response.messageKey ?? "unknown"} - ${serverMessage ?? "no message"}`
    );
    throw new BBBError(bbbError.SERVER_ERROR, serverMessage);
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

  createUrl(action: Action, params: URLSearchParams): string {
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

  async createMeeting(meetingId: string, meetingName: string, guestPolicy?: GuestPolicy) {
    try {
      const schema = bbbCreateMeetingSchema.parse({
        meetingID: meetingId,
        name: meetingName,
        guestPolicy,
      });
      const workaround = JSON.parse(JSON.stringify(schema));
      const params = new URLSearchParams(workaround);

      const url = this.createUrl(Action.CREATE, params);

      const data = await withFetch(url, { method: "GET" });
      const dataSchema = bbbCreateMeetingResponseSchema.safeParse(data);
      if (!dataSchema.success) throw new BBBError(bbbError.INVALID_XML_FORMAT);

      return {
        success: true,
        data: dataSchema.data,
      };
    } catch (err) {
      log.error(`[BBB] failed creating meeting: ${err}`);
      return this.handleError(err);
    }
  }

  async joinMeeting(meetingId: string, name: string, role: Role) {
    try {
      const schema = bbbJoinMeetingSchema.parse({
        meetingID: meetingId,
        fullName: name,
        role,
        redirect: false,
      });
      const workaround = JSON.parse(JSON.stringify(schema));
      const params = new URLSearchParams(workaround);

      const url = this.createUrl(Action.JOIN, params);

      const data = await withFetch(url, { method: "GET" });
      const dataSchema = bbbJoinMeetingResponseSchema.safeParse(data);
      if (!dataSchema.success) throw new BBBError(bbbError.INVALID_XML_FORMAT);

      return {
        success: true,
        data: dataSchema.data,
      };
    } catch (err) {
      log.error(`[BBB] failed joining meeting: ${err}`);
      return this.handleError(err);
    }
  }

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
      // A non-checksum error (e.g. missingParamMeetingID) means our secret is valid
      return true;
    } catch (err) {
      if (err instanceof BBBError) {
        if (err.error === bbbError.INVALID_CHECKSUM) {
          log.info(`[BBB] invalid configuration options — checksum mismatch`);
          return false;
        }
        if (err.error === bbbError.CANNOT_REACH_SERVER) {
          log.info(`[BBB] cannot reach server during checksum validation`);
          return false;
        }
        // SERVER_ERROR means the server responded — our secret is likely fine
        return true;
      }
      return false;
    }
  }
}
