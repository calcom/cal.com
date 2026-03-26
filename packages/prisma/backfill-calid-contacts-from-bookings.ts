import { parsePhoneNumberFromString } from "libphonenumber-js";
import { z } from "zod";

import { ensureCalIdContactFromBooking } from "@calcom/lib/server/service/calIdContactFromBooking";
import { getErrorFromUnknown } from "@calcom/lib/errors";

import prisma from ".";

type CliOptions = {
  dryRun: boolean;
  batchSize: number;
  maxBookings?: number;
};

type AttendeeCandidate = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
};

const emailSchema = z
  .string()
  .trim()
  .email()
  .transform((value) => value.toLowerCase());

const normalizeEmail = (email: string | null | undefined) => {
  const parsed = emailSchema.safeParse(email ?? "");
  return parsed.success ? parsed.data : null;
};

const normalizePhone = (phone: string | null | undefined) => {
  const trimmed = phone?.trim() ?? "";
  if (!trimmed) {
    return null;
  }
  const parsed = parsePhoneNumberFromString(trimmed);
  if (!parsed || !parsed.isValid()) {
    return null;
  }
  return parsed.number;
};

const parseCliOptions = (): CliOptions => {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    dryRun: false,
    batchSize: 200,
  };

  for (const arg of args) {
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      console.log(
        [
          "Backfill Cal ID contacts from past bookings where booking.userId is the host.",
          "",
          "Usage:",
          "  ts-node --transpile-only ./packages/prisma/backfill-calid-contacts-from-bookings.ts [options]",
          "",
          "Options:",
          "  --dry-run              Do not write contacts; only report what would be processed.",
          "  --batch-size=<number>  Number of bookings fetched per page (default: 200).",
          "  --max-bookings=<n>     Stop after scanning n bookings.",
          "  --help, -h             Show this help.",
        ].join("\n")
      );
      process.exit(0);
    }

    if (arg.startsWith("--batch-size=")) {
      const parsed = Number.parseInt(arg.split("=")[1] ?? "", 10);
      if (Number.isNaN(parsed) || parsed <= 0) {
        throw new Error(`Invalid --batch-size value: ${arg}`);
      }
      options.batchSize = parsed;
      continue;
    }

    if (arg.startsWith("--max-bookings=")) {
      const parsed = Number.parseInt(arg.split("=")[1] ?? "", 10);
      if (Number.isNaN(parsed) || parsed <= 0) {
        throw new Error(`Invalid --max-bookings value: ${arg}`);
      }
      options.maxBookings = parsed;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const extractFallbackFromResponses = (responses: unknown): AttendeeCandidate | null => {
  if (!isRecord(responses)) {
    return null;
  }

  const candidate: AttendeeCandidate = {
    name: typeof responses.name === "string" ? responses.name : null,
    email: typeof responses.email === "string" ? responses.email : null,
    phone:
      typeof responses.attendeePhoneNumber === "string"
        ? responses.attendeePhoneNumber
        : typeof responses.smsReminderNumber === "string"
        ? responses.smsReminderNumber
        : typeof responses.phone === "string"
        ? responses.phone
        : null,
  };

  return candidate;
};

const getAttendeeCandidates = ({
  attendees,
  responses,
}: {
  attendees: { name: string; email: string; phoneNumber: string | null }[];
  responses: unknown;
}) => {
  const fromAttendees = attendees.map((attendee) => ({
    name: attendee.name,
    email: attendee.email,
    phone: attendee.phoneNumber,
  }));

  if (fromAttendees.length > 0) {
    return fromAttendees;
  }

  const fallback = extractFallbackFromResponses(responses);
  return fallback ? [fallback] : [];
};

const hasUsableIdentifier = (attendee: AttendeeCandidate) => {
  return Boolean(normalizeEmail(attendee.email) || normalizePhone(attendee.phone));
};

async function main() {
  const options = parseCliOptions();
  const startedAt = Date.now();
  const now = new Date();

  console.log(
    `[start] mode=${options.dryRun ? "dry-run" : "write"} batchSize=${options.batchSize}` +
      (options.maxBookings ? ` maxBookings=${options.maxBookings}` : "")
  );

  let cursorId: number | undefined;
  let scannedBookings = 0;
  let bookingsWithNoAttendees = 0;
  let processedAttendees = 0;
  let skippedMissingIdentifier = 0;
  let createdContacts = 0;
  let linkedExisting = 0;
  let updatedContacts = 0;
  let secondaryPhonesAdded = 0;
  let errors = 0;
  let batches = 0;

  while (true) {
    const bookings = await prisma.booking.findMany({
      where: {
        userId: {
          not: null,
        },
        startTime: {
          lt: now,
        },
      },
      orderBy: {
        id: "asc",
      },
      take: options.batchSize,
      ...(cursorId
        ? {
            cursor: {
              id: cursorId,
            },
            skip: 1,
          }
        : {}),
      select: {
        id: true,
        uid: true,
        userId: true,
        responses: true,
        attendees: {
          select: {
            name: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });

    if (bookings.length === 0) {
      break;
    }

    batches += 1;

    for (const booking of bookings) {
      if (options.maxBookings && scannedBookings >= options.maxBookings) {
        break;
      }

      scannedBookings += 1;
      const attendeeCandidates = getAttendeeCandidates({
        attendees: booking.attendees,
        responses: booking.responses,
      });

      if (attendeeCandidates.length === 0) {
        bookingsWithNoAttendees += 1;
        continue;
      }

      // Avoid processing exact same attendee payload twice within the same booking.
      const seenWithinBooking = new Set<string>();

      for (const attendee of attendeeCandidates) {
        const dedupeKey = `${(attendee.email ?? "").trim().toLowerCase()}|${(attendee.phone ?? "").trim()}`;
        if (seenWithinBooking.has(dedupeKey)) {
          continue;
        }
        seenWithinBooking.add(dedupeKey);

        if (options.dryRun) {
          if (hasUsableIdentifier(attendee)) {
            processedAttendees += 1;
          } else {
            skippedMissingIdentifier += 1;
          }
          continue;
        }

        try {
          const result = await ensureCalIdContactFromBooking({
            source: "booking_created",
            userId: booking.userId as number,
            bookingId: booking.id,
            bookingUid: booking.uid,
            attendeeName: attendee.name,
            attendeeEmail: attendee.email,
            attendeePhone: attendee.phone,
          });

          if (result.status === "skipped") {
            skippedMissingIdentifier += 1;
            continue;
          }

          processedAttendees += 1;
          if (result.created) {
            createdContacts += 1;
          } else {
            linkedExisting += 1;
          }
          if (result.updated) {
            updatedContacts += 1;
          }
          if (result.secondaryPhoneAdded) {
            secondaryPhonesAdded += 1;
          }
        } catch (error) {
          errors += 1;
          const parsedError = getErrorFromUnknown(error);
          console.error(
            `[error] bookingId=${booking.id} bookingUid=${booking.uid} userId=${booking.userId} ` +
              `attendeeEmail=${attendee.email ?? ""} attendeePhone=${attendee.phone ?? ""} ` +
              `message=${parsedError.message}`
          );
        }
      }
    }

    cursorId = bookings[bookings.length - 1]?.id;

    const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
    console.log(
      `[progress] batches=${batches} scannedBookings=${scannedBookings} processedAttendees=${processedAttendees} ` +
        `created=${createdContacts} linkedExisting=${linkedExisting} updated=${updatedContacts} ` +
        `secondaryPhonesAdded=${secondaryPhonesAdded} skippedMissingIdentifier=${skippedMissingIdentifier} ` +
        `bookingsWithNoAttendees=${bookingsWithNoAttendees} errors=${errors} elapsed=${elapsedSeconds}s`
    );

    if (options.maxBookings && scannedBookings >= options.maxBookings) {
      break;
    }
  }

  const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
  console.log("[done]");
  console.log(
    JSON.stringify(
      {
        mode: options.dryRun ? "dry-run" : "write",
        scannedBookings,
        processedAttendees,
        createdContacts,
        linkedExisting,
        updatedContacts,
        secondaryPhonesAdded,
        skippedMissingIdentifier,
        bookingsWithNoAttendees,
        errors,
        elapsedSeconds,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    const parsedError = getErrorFromUnknown(error);
    console.error(`[fatal] ${parsedError.message}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
