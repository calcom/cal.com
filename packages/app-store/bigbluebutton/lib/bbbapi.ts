import { createHash } from "node:crypto";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { z } from "zod";

import logger from "@calcom/lib/logger";
import { logBlockedSSRFAttempt, validateUrlForSSRF } from "@calcom/lib/ssrfProtection";

import type { bbbOptions, Role } from "./types";

const log = logger.getSubLogger({ prefix: ["app-store/bigbluebutton/lib/bbbapi"] });
const MIN_API_VERSION = 2.4;

const xmlParser = new XMLParser({
  ignoreDeclaration: true,
});

const basicResponseSchema = z.object({
  response: z.discriminatedUnion("returncode", [
    z
      .object({
        returncode: z.literal("SUCCESS"),
      })
      .passthrough(),
    z.object({
      returncode: z.literal("FAILED"),
      messageKey: z.string().optional(),
      message: z.string().optional(),
    }),
  ]),
});

const instanceInfoSchema = z.object({
  apiVersion: z.union([z.string(), z.number()]).transform(Number),
});

const joinMeetingResponseSchema = z.object({
  url: z.string().url(),
});

class BBBError extends Error {
  constructor(
    public code: "checksum" | "network" | "xml" | "server",
    message?: string
  ) {
    super(message);
  }
}

export class BBBApi {
  constructor(private options: bbbOptions) {}

  createUrl(action: string, params = new URLSearchParams()) {
    const baseUrl = this.options.url.endsWith("/") ? this.options.url : `${this.options.url}/`;
    const url = new URL(action, baseUrl);
    const query = params.toString();

    if (query) {
      url.search = query;
    }

    if (action) {
      const checksum = createHash(this.options.hash)
        .update(`${action}${query}${this.options.secret}`)
        .digest("hex");
      url.searchParams.append("checksum", checksum);
    }

    return url.toString();
  }

  async createMeeting(meetingID: string, name: string) {
    try {
      await this.request("create", {
        meetingID,
        name,
        allowRequestsWithoutSession: "true",
        guestPolicy: "ALWAYS_ACCEPT",
      });
      return { success: true } as const;
    } catch (error) {
      log.error("[BBB] failed creating meeting", error);
      return this.toFailure(error);
    }
  }

  async joinMeeting(meetingID: string, fullName: string, role: Role) {
    try {
      const response = await this.request("join", {
        meetingID,
        fullName,
        role,
        redirect: "false",
      });
      return { success: true, data: joinMeetingResponseSchema.parse(response) } as const;
    } catch (error) {
      log.error("[BBB] failed joining meeting", error);
      return this.toFailure(error);
    }
  }

  async checkValidOptions() {
    try {
      const instanceInfo = instanceInfoSchema.parse(await this.request(""));
      if (instanceInfo.apiVersion < MIN_API_VERSION) return false;

      await this.request("getMeetings");
      return true;
    } catch (error) {
      log.info("[BBB] failed validating options", error);
      return false;
    }
  }

  private async request(action: string, params?: Record<string, string>) {
    const validation = await validateUrlForSSRF(this.options.url);
    if (!validation.isValid) {
      logBlockedSSRFAttempt(this.options.url, validation.error ?? "Invalid BigBlueButton URL", {
        app: "bigbluebutton",
      });
      throw new BBBError("network", validation.error ?? "Invalid BigBlueButton URL");
    }

    const url = this.createUrl(action, new URLSearchParams(params));
    const response = await fetch(url, { method: "GET" }).catch(() => {
      throw new BBBError("network", "BigBlueButton server is unreachable");
    });

    if (!response.ok) {
      throw new BBBError("network", "BigBlueButton server is unreachable");
    }

    const responseBody = await response.text();
    if (XMLValidator.validate(responseBody) !== true) {
      throw new BBBError("xml", "BigBlueButton server returned invalid XML");
    }

    const parsed = basicResponseSchema.safeParse(xmlParser.parse(responseBody));
    if (!parsed.success) {
      throw new BBBError("xml", "BigBlueButton server returned an unexpected response");
    }

    const data = parsed.data.response;
    if (data.returncode === "SUCCESS") return data;

    if (data.messageKey === "checksumError") {
      throw new BBBError("checksum", "BigBlueButton checksum validation failed");
    }

    throw new BBBError("server", data.message);
  }

  private toFailure(error: unknown) {
    if (error instanceof BBBError) {
      return { success: false, message: error.message } as const;
    }

    return { success: false, message: "BigBlueButton request failed" } as const;
  }
}
