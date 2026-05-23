import { createHash, randomUUID } from "node:crypto";

type BigBlueButtonMethod = "create" | "join" | "end";

const BBB_PATH = "/bigbluebutton";

export const normalizeBigBlueButtonBaseUrl = (value: string): string => {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) {
    throw new Error("BigBlueButton host is required");
  }

  const url = new URL(trimmed);
  if (url.pathname.endsWith("/api")) {
    url.pathname = url.pathname.replace(/\/api$/, "");
  }
  if (url.pathname === "" || url.pathname === "/") {
    url.pathname = BBB_PATH;
  }
  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";

  return url.toString().replace(/\/+$/, "");
};

export const sanitizeMeetingId = (value: string): string => {
  const sanitized = value
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return sanitized || randomUUID();
};

export const buildSignedBigBlueButtonUrl = ({
  baseUrl,
  method,
  params,
  sharedSecret,
}: {
  baseUrl: string;
  method: BigBlueButtonMethod;
  params: URLSearchParams;
  sharedSecret: string;
}): string => {
  const query = params.toString();
  const checksum = createHash("sha1").update(`${method}${query}${sharedSecret}`).digest("hex");

  return `${normalizeBigBlueButtonBaseUrl(baseUrl)}/api/${method}?${query}&checksum=${checksum}`;
};

export const getBigBlueButtonCreateUrl = ({
  baseUrl,
  meetingId,
  meetingName,
  attendeePassword,
  moderatorPassword,
  sharedSecret,
}: {
  baseUrl: string;
  meetingId: string;
  meetingName: string;
  attendeePassword: string;
  moderatorPassword: string;
  sharedSecret: string;
}): string => {
  const params = new URLSearchParams();
  params.set("name", meetingName);
  params.set("meetingID", meetingId);
  params.set("attendeePW", attendeePassword);
  params.set("moderatorPW", moderatorPassword);

  return buildSignedBigBlueButtonUrl({ baseUrl, method: "create", params, sharedSecret });
};

export const getBigBlueButtonJoinUrl = ({
  baseUrl,
  meetingId,
  fullName,
  password,
  sharedSecret,
}: {
  baseUrl: string;
  meetingId: string;
  fullName: string;
  password: string;
  sharedSecret: string;
}): string => {
  const params = new URLSearchParams();
  params.set("fullName", fullName);
  params.set("meetingID", meetingId);
  params.set("password", password);

  return buildSignedBigBlueButtonUrl({ baseUrl, method: "join", params, sharedSecret });
};

export const getBigBlueButtonEndUrl = ({
  baseUrl,
  meetingId,
  moderatorPassword,
  sharedSecret,
}: {
  baseUrl: string;
  meetingId: string;
  moderatorPassword: string;
  sharedSecret: string;
}): string => {
  const params = new URLSearchParams();
  params.set("meetingID", meetingId);
  params.set("password", moderatorPassword);

  return buildSignedBigBlueButtonUrl({ baseUrl, method: "end", params, sharedSecret });
};
