import z from "zod";

export const bbbOptionsSchema = z.object({
  url: z.string().url(),
  secret: z.string(),
  hash: z.enum(["sha1", "sha256", "sha384", "sha512"]),
});
export type bbbOptions = z.infer<typeof bbbOptionsSchema>;

export enum Action {
  CREATE = "create",
  JOIN = "join",
  DELETE = "end",
  INSTANCE_INFO = "", // nothing, just / please
}

export enum Role {
  MODERATOR = "MODERATOR",
  VIEWER = "VIEWER",
}

export enum GuestPolicy {
  ALWAYS_ACCEPT = "ALWAYS_ACCEPT",
  ALWAYS_DENY = "ALWAYS_DENY",
  ASK_MODERATOR = "ASK_MODERATOR",
}

// typical node fetch client
// speedy schema goes in, url encoded schema with sha-1 hash goes out
export const bbbCreateMeetingSchema = z.object({
  meetingID: z.string(),
  name: z.string(),
  guestPolicy: z.nativeEnum(GuestPolicy).default(GuestPolicy.ALWAYS_ACCEPT),
  allowRequestsWithoutSession: z.boolean().default(true),
});

export const bbbJoinMeetingSchema = z.object({
  meetingID: z.string(),
  fullName: z.string(),
  role: z.nativeEnum(Role),
  redirect: z.boolean().default(false),
  logoutURL: z.string().optional(), // redirect for when the user clicks the OK button on the meeting ended screen
  errorRedirectUrl: z.string().optional(), // redirect for when there's an error joining the meeting
});

export const bbbEncryptedSchema = z.object({
  private: z.string(),
});

/*
Create meeting response
<response>
  <returncode>SUCCESS</returncode>
  <meetingID>random-6970858</meetingID>
  <internalMeetingID>a9c38ee48e1eed2bcdb8a197f68c7fbe40ecc3e8-1749413782498</internalMeetingID>
  <parentMeetingID>bbb-none</parentMeetingID>
  <attendeePW>ap</attendeePW>
  <moderatorPW>mp</moderatorPW>
  <createTime>1749413782498</createTime>
  <voiceBridge>78748</voiceBridge>
  <dialNumber>613-555-1234</dialNumber>
  <createDate>Sun Jun 08 20:16:22 UTC 2025</createDate>
  <hasUserJoined>false</hasUserJoined>
  <duration>0</duration>
  <hasBeenForciblyEnded>false</hasBeenForciblyEnded>
  <messageKey/>
  <message/>
</response>
*/

export const bbbCreateMeetingResponseSchema = z.object({
  returncode: z.literal("SUCCESS"),
  meetingID: z.string(),
  internalMeetingID: z.string(),
  parentMeetingID: z.string(),
  attendeePW: z.string(),
  moderatorPW: z.string(),
  createTime: z.number(),
  voiceBridge: z.number(),
  dialNumber: z.string(),
  createDate: z.string(),
  hasUserJoined: z.boolean(),
  duration: z.number(),
  hasBeenForciblyEnded: z.boolean(),
  messageKey: z.string(),
  message: z.string(),
});

/*
Getting info about the bbb instance
<response>
  <returncode>SUCCESS</returncode>
  <version>2.0</version>
  <apiVersion>2.0</apiVersion>            <-- That's the one you want
  <bbbVersion/>
  <graphqlWebsocketUrl>wss://172.21.17.39/graphql</graphqlWebsocketUrl>
  <graphqlApiUrl>https://172.21.17.39/api/rest</graphqlApiUrl>
</response>
*/

export const bbbInstanceInfoSchema = z.object({
  returncode: z.literal("SUCCESS"),
  version: z.string(), // BBB API returns version as string e.g. "2.0"
  apiVersion: z.string(), // BBB API returns apiVersion as string e.g. "2.0"
  bbbVersion: z.string().optional(), // Optional - may be empty on some versions
  graphqlWebsocketUrl: z.string().optional(), // Only available on BBB 2.5+ with GraphQL enabled
  graphqlApiUrl: z.string().optional(), // Only available on BBB 2.5+ with GraphQL enabled
});

/*
Join meeting response
<response>
  <returncode>SUCCESS</returncode>
  <messageKey>successfullyJoined</messageKey>
  <message>You have joined successfully.</message>
  <meeting_id>47f951379c7d0af59c10e778ae56f760114e2ba3-1749425486722</meeting_id>
  <user_id>w_8bs9bikedyop</user_id>
  <auth_token>4xy6ixhupshm</auth_token>
  <session_token>xbhvpzghrqymtyav</session_token>
  <guestStatus>ALLOW</guestStatus>
  <url>https://172.21.17.39/html5client?sessionToken=xbhvpzghrqymtyav</url>
</response>
*/

export const bbbJoinMeetingResponseSchema = z.object({
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

// Using a discriminated union because these two guys are practically using the same field but different results.
// Am also using passthrough if the response is successful.
export const bbbBasicResponseSchema = z.object({
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

// the last error will be used if we get an unexpected error.
export enum bbbError {
  CANNOT_REACH_SERVER,
  NETWORK_ERROR,
  INVALID_CHECKSUM,
  INVALID_XML_FORMAT,
}
export const bbbErrorMessages: Record<bbbError, string> = {
  [bbbError.CANNOT_REACH_SERVER]: "Seems like the BigBlueButton server is unreachable",
  [bbbError.NETWORK_ERROR]: "A network error occurred",
  [bbbError.INVALID_CHECKSUM]: "Checksums do not match",
  [bbbError.INVALID_XML_FORMAT]: "Invalid XML format returned from the server",
};
