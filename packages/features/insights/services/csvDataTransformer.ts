import dayjs from "@calcom/dayjs";
import { SYSTEM_PHONE_FIELDS, SystemField } from "@calcom/lib/bookings/SystemField";
import { eventTypeBookingFields } from "@calcom/prisma/zod-utils";

const DATE_FORMAT = "YYYY-MM-DD";
const TIME_FORMAT = "HH:mm:ss";

export type BookingTimeStatusData = {
  id: number;
  uid: string | null;
  title: string;
  createdAt: Date;
  timeStatus: string;
  eventTypeId: number | null;
  eventLength: number;
  startTime: Date;
  endTime: Date;
  paid: boolean;
  userEmail: string;
  userUsername: string;
  rating: number | null;
  ratingFeedback: string | null;
  noShowHost: boolean;
};

export type BookingWithAttendees = {
  uid: string;
  eventTypeId: number | null;
  attendees: {
    name: string;
    email: string;
    phoneNumber: string | null;
    noShow: boolean | null;
  }[];
  seatsReferences: {
    attendee: {
      name: string;
      email: string;
      phoneNumber: string | null;
      noShow: boolean | null;
    };
  }[];
  responses: unknown;
  eventType: {
    bookingFields: unknown;
  } | null;
};

export type ProcessedBookingData = {
  noShowGuests: string | null;
  noShowGuestsCount: number;
  attendeeList: string[];
  attendeePhoneNumbers: (string | null)[];
  bookingQuestionResponses: Record<string, string | null>;
};

export type BookingFieldInfo = {
  name: string;
  label: string;
};

export type ProcessBookingsResult = {
  bookingMap: Map<string, ProcessedBookingData>;
  maxAttendees: number;
  allBookingQuestionLabels: Set<string>;
};

export function extractFieldValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const filtered = value.filter((v) => v != null && v !== "");
    return filtered.length > 0 ? filtered.join(", ") : null;
  }
  if (value && typeof value === "object" && "value" in value) {
    const val = (value as { value: unknown }).value;
    return extractFieldValue(val);
  }
  return null;
}

export function isSystemField(fieldName: string): boolean {
  return SystemField.safeParse(fieldName).success;
}

export function getPhoneFieldsForSeatedEvent(bookingFields: unknown): BookingFieldInfo[] | null {
  const parsed = eventTypeBookingFields.safeParse(bookingFields);
  if (!parsed.success) return null;

  return parsed.data
    .filter((field) => field.type === "phone" && !SYSTEM_PHONE_FIELDS.has(field.name))
    .map((field) => ({ name: field.name, label: field.label || field.name }));
}

export function getAllFieldsForNonSeatedEvent(
  bookingFields: unknown
): { fields: BookingFieldInfo[]; phoneFieldNames: Set<string> } | null {
  const parsed = eventTypeBookingFields.safeParse(bookingFields);
  if (!parsed.success) return null;

  const phoneNames = new Set<string>();
  const fields = parsed.data
    .filter((field) => !isSystemField(field.name))
    .map((field) => {
      if (field.type === "phone") {
        phoneNames.add(field.name);
      }
      return { name: field.name, label: field.label || field.name };
    });

  return { fields, phoneFieldNames: phoneNames };
}

export function processBookingAttendees(
  booking: BookingWithAttendees,
  bookingFields: BookingFieldInfo[] | null,
  phoneFieldNames: Set<string> | null,
  isSeatedEvent: boolean
): ProcessedBookingData {
  const attendeeList =
    booking.seatsReferences.length > 0
      ? booking.seatsReferences.map((ref) => ref.attendee)
      : booking.attendees;

  const formattedAttendees: string[] = [];
  const noShowAttendees: string[] = [];
  const attendeePhoneNumbers: (string | null)[] = [];
  let noShowGuestsCount = 0;

  const bookingQuestionResponses: Record<string, string | null> = {};
  let systemPhoneValue: string | null = null;
  let firstCustomPhoneValue: string | null = null;

  if (booking.responses && typeof booking.responses === "object") {
    const responses = booking.responses as Record<string, unknown>;

    systemPhoneValue =
      extractFieldValue(responses.attendeePhoneNumber) ||
      extractFieldValue(responses.smsReminderNumber) ||
      null;

    if (bookingFields) {
      for (const field of bookingFields) {
        const value = extractFieldValue(responses[field.name]);
        bookingQuestionResponses[field.label] = value;
        if (firstCustomPhoneValue === null && value !== null) {
          if (isSeatedEvent || phoneFieldNames?.has(field.name)) {
            firstCustomPhoneValue = value;
          }
        }
      }
    }
  }

  const phoneFallback = systemPhoneValue || firstCustomPhoneValue;

  for (const attendee of attendeeList) {
    if (attendee) {
      const formatted = `${attendee.name} (${attendee.email})`;
      formattedAttendees.push(formatted);
      attendeePhoneNumbers.push(attendee.phoneNumber || phoneFallback);
      if (attendee.noShow) {
        noShowAttendees.push(formatted);
        noShowGuestsCount++;
      }
    }
  }

  const noShowGuests = noShowAttendees.length > 0 ? noShowAttendees.join("; ") : null;

  return {
    noShowGuests,
    noShowGuestsCount,
    attendeeList: formattedAttendees,
    attendeePhoneNumbers,
    bookingQuestionResponses,
  };
}

export function processBookingsForCsv(bookings: BookingWithAttendees[]): ProcessBookingsResult {
  const phoneFieldsCache = new Map<number, BookingFieldInfo[]>();
  const allFieldsCache = new Map<number, { fields: BookingFieldInfo[]; phoneFieldNames: Set<string> }>();
  const allBookingQuestionLabels = new Set<string>();
  let maxAttendees = 0;
  const bookingMap = new Map<string, ProcessedBookingData>();

  for (const booking of bookings) {
    const eventTypeId = booking.eventTypeId;
    const isSeatedEvent = booking.seatsReferences.length > 0;
    let bookingFields: BookingFieldInfo[] | null = null;
    let phoneFieldNames: Set<string> | null = null;

    if (eventTypeId) {
      if (isSeatedEvent) {
        const cached = phoneFieldsCache.get(eventTypeId);
        if (cached !== undefined) {
          bookingFields = cached;
        } else if (booking.eventType?.bookingFields) {
          bookingFields = getPhoneFieldsForSeatedEvent(booking.eventType.bookingFields);
          if (bookingFields) {
            phoneFieldsCache.set(eventTypeId, bookingFields);
            bookingFields.forEach((field) => allBookingQuestionLabels.add(field.label));
          }
        }
      } else {
        const cached = allFieldsCache.get(eventTypeId);
        if (cached !== undefined) {
          bookingFields = cached.fields;
          phoneFieldNames = cached.phoneFieldNames;
        } else if (booking.eventType?.bookingFields) {
          const result = getAllFieldsForNonSeatedEvent(booking.eventType.bookingFields);
          if (result) {
            bookingFields = result.fields;
            phoneFieldNames = result.phoneFieldNames;
            allFieldsCache.set(eventTypeId, result);
            bookingFields.forEach((field) => allBookingQuestionLabels.add(field.label));
          }
        }
      }
    }

    const processedData = processBookingAttendees(booking, bookingFields, phoneFieldNames, isSeatedEvent);

    if (processedData.attendeeList.length > maxAttendees) {
      maxAttendees = processedData.attendeeList.length;
    }

    bookingMap.set(booking.uid, processedData);
  }

  return { bookingMap, maxAttendees, allBookingQuestionLabels };
}

export function formatCsvRow(
  bookingTimeStatus: BookingTimeStatusData,
  processedData: ProcessedBookingData | null,
  maxAttendees: number,
  allBookingQuestionLabels: Set<string>,
  timeZone: string
): Record<string, unknown> {
  const dateAndTime = {
    createdAt: bookingTimeStatus.createdAt.toISOString(),
    createdAt_date: dayjs(bookingTimeStatus.createdAt).tz(timeZone).format(DATE_FORMAT),
    createdAt_time: dayjs(bookingTimeStatus.createdAt).tz(timeZone).format(TIME_FORMAT),
    startTime: bookingTimeStatus.startTime.toISOString(),
    startTime_date: dayjs(bookingTimeStatus.startTime).tz(timeZone).format(DATE_FORMAT),
    startTime_time: dayjs(bookingTimeStatus.startTime).tz(timeZone).format(TIME_FORMAT),
    endTime: bookingTimeStatus.endTime.toISOString(),
    endTime_date: dayjs(bookingTimeStatus.endTime).tz(timeZone).format(DATE_FORMAT),
    endTime_time: dayjs(bookingTimeStatus.endTime).tz(timeZone).format(TIME_FORMAT),
  };

  const result: Record<string, unknown> = {
    ...bookingTimeStatus,
    ...dateAndTime,
    noShowGuests: processedData?.noShowGuests || null,
    noShowGuestsCount: processedData?.noShowGuestsCount || 0,
  };

  for (let i = 1; i <= maxAttendees; i++) {
    result[`attendee${i}`] = processedData?.attendeeList[i - 1] || null;
    result[`attendeePhone${i}`] = processedData?.attendeePhoneNumbers[i - 1] || null;
  }

  allBookingQuestionLabels.forEach((label) => {
    result[label] = processedData?.bookingQuestionResponses[label] || null;
  });

  return result;
}

export function transformBookingsForCsv(
  csvData: BookingTimeStatusData[],
  bookings: BookingWithAttendees[],
  timeZone: string
): Record<string, unknown>[] {
  const { bookingMap, maxAttendees, allBookingQuestionLabels } = processBookingsForCsv(bookings);

  return csvData.map((bookingTimeStatus) => {
    const processedData = bookingTimeStatus.uid ? bookingMap.get(bookingTimeStatus.uid) : null;
    return formatCsvRow(
      bookingTimeStatus,
      processedData || null,
      maxAttendees,
      allBookingQuestionLabels,
      timeZone
    );
  });
}
