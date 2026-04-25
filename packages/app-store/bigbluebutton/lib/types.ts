import { z } from "zod";

export enum Action {
  CREATE = "create",
  JOIN = "join",
  INSTANCE_INFO = "getMeetingInfo",
  END = "end",
}

export enum Role {
  MODERATOR = "MODERATOR",
  VIEWER = "VIEWER",
}

export type GuestPolicy = "ALWAYS_ACCEPT" | "ALWAYS_DENY" | "ASK_MODERATOR";

export enum bbbError {
  CANNOT_REACH_SERVER = "CANNOT_REACH_SERVER",
  INVALID_CHECKSUM = "INVALID_CHECKSUM",
  INVALID_XML_FORMAT = "INVALID_XML_FORMAT",
  SERVER_ERROR = "SERVER_ERROR",
}

export const bbbErrorMessages: Record<bbbError, string> = {
  [bbbError.CANNOT_REACH_SERVER]: "Cannot reach the BigBlueButton server",
  [bbbError.INVALID_CHECKSUM]: "Invalid checksum — check your shared secret and checksum algorithm",
  [bbbError.INVALID_XML_FORMAT]: "Invalid XML response from BigBlueButton server",
  [bbbError.SERVER_ERROR]: "BigBlueButton server returned an error",
};

export const bbbOptionsSchema = z.object({
  url: z.string().url(),
  secret: z.string().min(1),
  hash: z.enum(["sha1", "sha256", "sha384", "sha512"]).default("sha256"),
});

export type bbbOptions = z.infer<typeof bbbOptionsSchema>;

export const bbbEncryptedSchema = z.object({
  private: z.string(),
});

export const bbbCreateMeetingSchema = z.object({
  meetingID: z.string(),
  name: z.string(),
  guestPolicy: z.string().optional(),
});

export const bbbJoinMeetingSchema = z.object({
  meetingID: z.string(),
  fullName: z.string(),
  role: z.nativeEnum(Role),
  redirect: z.boolean().default(true),
});

export const bbbBasicResponseSchema = z.object({
  response: z.object({
    returncode: z.string(),
    messageKey: z.string().optional(),
    message: z.string().optional(),
  }),
});

export const bbbCreateMeetingResponseSchema = z.object({
  returncode: z.string(),
  meetingID: z.string(),
  internalMeetingID: z.string().optional(),
  parentMeetingID: z.string().optional(),
  attendeePW: z.string().optional(),
  moderatorPW: z.string().optional(),
  createTime: z.number().optional(),
  voiceBridge: z.number().optional(),
  dialNumber: z.string().optional(),
  createDate: z.string().optional(),
  hasUserJoined: z.union([z.boolean(), z.string()]).optional(),
  duration: z.number().optional(),
  hasBeenForciblyEnded: z.union([z.boolean(), z.string()]).optional(),
  messageKey: z.string().optional(),
  message: z.string().optional(),
});

export const bbbJoinMeetingResponseSchema = z.object({
  returncode: z.string(),
  messageKey: z.string().optional(),
  message: z.string().optional(),
  meeting_id: z.string().optional(),
  user_id: z.string().optional(),
  auth_token: z.string().optional(),
  session_token: z.string().optional(),
  guestStatus: z.string().optional(),
  url: z.string(),
});

export const bbbInstanceInfoSchema = z.object({
  returncode: z.string(),
  version: z.string().optional(),
  apiVersion: z.string(),
  bbbVersion: z.string().optional(),
  allowRequestsWithoutSession: z.union([z.boolean(), z.string()]).optional(),
});
