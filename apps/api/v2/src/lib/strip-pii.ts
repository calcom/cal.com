const PII_FIELDS: string[] = ["email", "displayEmail", "name", "bookingFieldsResponses"];

function stripPiiFromAttendees(attendees: Record<string, unknown>[]): Record<string, unknown>[] {
  return attendees.map((attendee) => ({ id: attendee.id }));
}

export function stripPiiFromObject(obj: Record<string, unknown>): Record<string, unknown> {
  if (!obj || typeof obj !== "object") {
    return {};
  }

  const sanitized: Record<string, unknown> = {};

  for (const key of Object.keys(obj)) {
    if (PII_FIELDS.includes(key)) {
      continue;
    }

    if (key === "attendees" && Array.isArray(obj[key])) {
      sanitized[key] = stripPiiFromAttendees(obj[key] as Record<string, unknown>[]);
      continue;
    }

    sanitized[key] = obj[key];
  }

  return sanitized;
}

export function stripPiiFromResponseData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized = stripPiiFromObject(data);

  if (sanitized.data && typeof sanitized.data === "object" && !Array.isArray(sanitized.data)) {
    sanitized.data = stripPiiFromObject(sanitized.data as Record<string, unknown>);
  }

  if (sanitized.data && Array.isArray(sanitized.data)) {
    sanitized.data = (sanitized.data as Record<string, unknown>[]).map((item) => {
      if (item && typeof item === "object") {
        return stripPiiFromObject(item as Record<string, unknown>);
      }
      return item;
    });
  }

  return sanitized;
}
