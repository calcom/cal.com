import { parsePhoneNumberFromString } from "libphonenumber-js";
import { z } from "zod";

import { getErrorFromUnknown } from "@calcom/lib/errors";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma, { type PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

type ContactLinkSource = "booking_created" | "booking_confirmed";

type EnsureCalIdContactFromBookingInput = {
  userId: number;
  bookingId: number;
  bookingUid?: string | null;
  attendeeName?: string | null;
  attendeeEmail?: string | null;
  attendeePhone?: string | null;
  source: ContactLinkSource;
};

type EnsureCalIdContactFromBookingResult =
  | {
      status: "skipped";
      reason: "missing_contact_identifiers";
    }
  | {
      status: "linked";
      contactId: number;
      created: boolean;
      updated: boolean;
      secondaryPhoneAdded: boolean;
    };

type ContactRow = {
  id: number;
  userId: number;
  name: string;
  email: string;
  phone: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: unknown;
};

type ContactMetadata = {
  secondaryPhones?: string[];
  [key: string]: unknown;
};

const emailSchema = z
  .string()
  .trim()
  .email()
  .transform((value) => value.toLowerCase());
const log = logger.getSubLogger({ prefix: ["[calid-contact-linking]"] });

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

const normalizePhoneForComparison = (phone: string | null | undefined) => {
  const trimmed = phone?.trim() ?? "";
  if (!trimmed) {
    return "";
  }
  return normalizePhone(trimmed) ?? trimmed;
};

const parseContactMetadata = (metadata: unknown): ContactMetadata => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }
  return metadata as ContactMetadata;
};

const getSecondaryPhones = (metadata: unknown) => {
  const parsed = parseContactMetadata(metadata);
  if (!Array.isArray(parsed.secondaryPhones)) {
    return [];
  }
  return parsed.secondaryPhones
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
};

const resolveName = ({
  attendeeName,
  attendeeEmail,
  attendeePhone,
}: {
  attendeeName?: string | null;
  attendeeEmail: string | null;
  attendeePhone: string | null;
}) => {
  const trimmed = attendeeName?.trim() ?? "";
  if (trimmed) {
    return trimmed;
  }
  return attendeeEmail ?? attendeePhone ?? "Unknown contact";
};

const hasComparablePhone = (contact: ContactRow, comparablePhoneCandidates: Set<string>) => {
  const primaryComparable = normalizePhoneForComparison(contact.phone);
  if (primaryComparable && comparablePhoneCandidates.has(primaryComparable)) {
    return true;
  }

  const secondaryPhones = getSecondaryPhones(contact.metadata);
  return secondaryPhones.some((value) => {
    const comparable = normalizePhoneForComparison(value);
    return Boolean(comparable) && comparablePhoneCandidates.has(comparable);
  });
};

const appendSecondaryPhone = async ({
  tx,
  contact,
  phoneToAppend,
}: {
  tx: Prisma.TransactionClient;
  contact: ContactRow;
  phoneToAppend: string;
}) => {
  const metadata = parseContactMetadata(contact.metadata);
  const existingSecondaryPhones = getSecondaryPhones(contact.metadata);
  const contactPrimaryComparablePhone = normalizePhoneForComparison(contact.phone);
  const phoneToAppendComparable = normalizePhoneForComparison(phoneToAppend);

  if (!phoneToAppendComparable) {
    return false;
  }

  if (contactPrimaryComparablePhone === phoneToAppendComparable) {
    return false;
  }

  const existingComparablePhones = new Set(
    existingSecondaryPhones.map((value) => normalizePhoneForComparison(value)).filter(Boolean)
  );

  if (existingComparablePhones.has(phoneToAppendComparable)) {
    return false;
  }

  const nextSecondaryPhones = [...existingSecondaryPhones, phoneToAppend];
  const nextMetadata: ContactMetadata = {
    ...metadata,
    secondaryPhones: nextSecondaryPhones,
  };

  await tx.$executeRaw`
    UPDATE "CalIdContact"
    SET "metadata" = ${JSON.stringify(nextMetadata)}::jsonb,
        "updatedAt" = NOW()
    WHERE "id" = ${contact.id}
  `;

  return true;
};

export const ensureCalIdContactFromBooking = async (
  input: EnsureCalIdContactFromBookingInput,
  prismaClient: PrismaClient = prisma
): Promise<EnsureCalIdContactFromBookingResult> => {
  const normalizedEmail = normalizeEmail(input.attendeeEmail);
  const normalizedPhone = normalizePhone(input.attendeePhone);

  if (!normalizedEmail && !normalizedPhone) {
    return {
      status: "skipped",
      reason: "missing_contact_identifiers",
    };
  }

  const contactName = resolveName({
    attendeeName: input.attendeeName,
    attendeeEmail: normalizedEmail,
    attendeePhone: normalizedPhone,
  });

  return prismaClient
    .$transaction(async (tx) => {
      // Serialize contact-link writes per user to reduce duplicate rows under retries/concurrency.
      await tx.$queryRaw`
      SELECT id FROM "users"
      WHERE id = ${input.userId}
      FOR UPDATE
    `;

      const contacts = await tx.$queryRaw<ContactRow[]>`
      SELECT "id", "userId", "name", "email", "phone", "notes", "createdAt", "updatedAt", "metadata"
      FROM "CalIdContact"
      WHERE "userId" = ${input.userId}
      ORDER BY "createdAt" ASC, "id" ASC
    `;

      const comparablePhoneCandidates = new Set<string>();
      if (normalizedPhone) {
        comparablePhoneCandidates.add(normalizePhoneForComparison(normalizedPhone));
        const rawPhone = input.attendeePhone?.trim() ?? "";
        if (rawPhone) {
          comparablePhoneCandidates.add(normalizePhoneForComparison(rawPhone));
        }
      }

      const emailMatch =
        normalizedEmail !== null
          ? contacts.find((contact) => normalizeEmail(contact.email) === normalizedEmail) ?? null
          : null;

      const phoneMatch =
        comparablePhoneCandidates.size > 0
          ? contacts.find((contact) => hasComparablePhone(contact, comparablePhoneCandidates)) ?? null
          : null;

      let selectedContact: ContactRow | null = null;
      let shouldCreateNewContact = false;
      let shouldIgnoreIncomingPhone = false;

      if (emailMatch) {
        selectedContact = emailMatch;

        if (phoneMatch && phoneMatch.id !== emailMatch.id) {
          shouldIgnoreIncomingPhone = true;
          log.warn(
            "Cal ID contact dedupe conflict. Prioritizing email match and skipping phone-linked contact.",
            safeStringify({
              source: input.source,
              userId: input.userId,
              bookingId: input.bookingId,
              bookingUid: input.bookingUid ?? null,
              emailMatchedContactId: emailMatch.id,
              phoneMatchedContactId: phoneMatch.id,
              normalizedEmail,
              normalizedPhone,
            })
          );
        }
      } else if (phoneMatch) {
        if (!normalizedEmail) {
          selectedContact = phoneMatch;
        } else {
          const phoneMatchEmail = normalizeEmail(phoneMatch.email);
          if (!phoneMatchEmail) {
            selectedContact = phoneMatch;
          } else if (phoneMatchEmail === normalizedEmail) {
            selectedContact = phoneMatch;
          } else {
            shouldCreateNewContact = true;
          }
        }
      } else {
        shouldCreateNewContact = true;
      }

      if (shouldCreateNewContact || !selectedContact) {
        const createdContact = await tx.calIdContact.create({
          data: {
            userId: input.userId,
            name: contactName,
            email: normalizedEmail ?? "",
            phone: normalizedPhone ?? "",
            notes: "",
          },
          select: {
            id: true,
          },
        });

        return {
          status: "linked",
          contactId: createdContact.id,
          created: true,
          updated: false,
          secondaryPhoneAdded: false,
        };
      }

      const contactUpdateData: Prisma.CalIdContactUpdateInput = {};
      let updated = false;

      if (!selectedContact.name.trim() && contactName) {
        contactUpdateData.name = contactName;
      }

      if (normalizedEmail && !normalizeEmail(selectedContact.email)) {
        contactUpdateData.email = normalizedEmail;
      }

      if (!shouldIgnoreIncomingPhone && normalizedPhone && !selectedContact.phone.trim()) {
        contactUpdateData.phone = normalizedPhone;
      }

      if (Object.keys(contactUpdateData).length > 0) {
        await tx.calIdContact.update({
          where: {
            id: selectedContact.id,
          },
          data: contactUpdateData,
        });
        updated = true;
        selectedContact = {
          ...selectedContact,
          name: typeof contactUpdateData.name === "string" ? contactUpdateData.name : selectedContact.name,
          email:
            typeof contactUpdateData.email === "string" ? contactUpdateData.email : selectedContact.email,
          phone:
            typeof contactUpdateData.phone === "string" ? contactUpdateData.phone : selectedContact.phone,
        };
      }

      let secondaryPhoneAdded = false;
      if (!shouldIgnoreIncomingPhone && normalizedPhone && selectedContact.phone.trim()) {
        secondaryPhoneAdded = await appendSecondaryPhone({
          tx,
          contact: selectedContact,
          phoneToAppend: normalizedPhone,
        });
      }

      return {
        status: "linked",
        contactId: selectedContact.id,
        created: false,
        updated,
        secondaryPhoneAdded,
      };
    })
    .catch((error) => {
      const parsedError = getErrorFromUnknown(error);
      log.error(
        "Failed to ensure Cal ID contact from booking",
        safeStringify({
          source: input.source,
          userId: input.userId,
          bookingId: input.bookingId,
          bookingUid: input.bookingUid ?? null,
          attendeeEmail: input.attendeeEmail ?? null,
          attendeePhone: input.attendeePhone ?? null,
          error: parsedError.message,
        })
      );
      throw error;
    });
};

export type { EnsureCalIdContactFromBookingInput, EnsureCalIdContactFromBookingResult };
