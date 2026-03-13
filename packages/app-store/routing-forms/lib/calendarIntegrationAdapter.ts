import type { FormResponse, Field } from "../types/types";
import getFieldIdentifier from "./getFieldIdentifier";
import { getFieldResponseForJsonLogic } from "./transformResponse";

export type EventTypeContext = {
  username?: string | null;
  teamSlug?: string | null;
};

export const applyFieldUpdate = (
  prev: FormResponse,
  fieldIdentifier: string,
  value: number | string | string[],
  fields: Field[] | undefined
): FormResponse => {
  console.log("Applying field update: ", { fieldIdentifier, value });
  if (!fields) return prev;
  const match = fields.find((field) => getFieldIdentifier(field) === fieldIdentifier);
  if (!match) return prev;
  return {
    ...prev,
    [match.id]: {
      label: match.label,
      identifier: match.identifier,
      value: getFieldResponseForJsonLogic({ field: match, value }),
    },
  };
};

export const resolveEventTypeValue = (
  response: FormResponse,
  fields: Field[] | undefined,
  defaultIdentifier = "event_type"
): string | null => {
  if (!fields) return null;
  const match = fields.find((field) => getFieldIdentifier(field) === defaultIdentifier);
  if (!match || match.type === "calendar") return null;
  const value = response[match.id]?.value;
  return typeof value === "string" && value.trim().length ? value : null;
};

export const parseEventTypeInput = (
  input: string,
  context: EventTypeContext = {}
): { username: string | null; eventSlug: string | null; isTeamEvent: boolean } => {
  const raw = input.trim();
  if (!raw) return { username: null, eventSlug: null, isTeamEvent: false };
  let path = raw;
  try {
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      path = new URL(raw).pathname;
    }
  } catch {
    // ignore malformed URL
  }
  if (path.startsWith("/")) path = path.slice(1);
  const parts = path.split("?")[0].split("#")[0].split("/").filter(Boolean);
  if (parts[0] === "team" && parts.length >= 3) {
    return { username: parts[1], eventSlug: parts[2], isTeamEvent: true };
  }
  if (parts.length >= 2) {
    return { username: parts[0], eventSlug: parts[1], isTeamEvent: false };
  }
  if (context.teamSlug) {
    return { username: context.teamSlug, eventSlug: parts[0] ?? raw, isTeamEvent: true };
  }
  if (context.username) {
    return { username: context.username, eventSlug: parts[0] ?? raw, isTeamEvent: false };
  }
  return { username: null, eventSlug: parts[0] ?? raw, isTeamEvent: false };
};

export const validateEventOwnership = (
  parsed: { username: string | null; eventSlug: string | null; isTeamEvent: boolean },
  context: EventTypeContext
): boolean => {
  // if (!parsed.username || !parsed.eventSlug) return false;
  // if (parsed.isTeamEvent) {
  //   return !!context.teamSlug && parsed.username === context.teamSlug;
  // }
  // return !!context.username && parsed.username === context.username;

  return true;
};
