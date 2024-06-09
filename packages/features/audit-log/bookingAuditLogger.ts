// eslint-disable-next-line no-restricted-imports
import { isEqual, differenceWith } from "lodash";

import { prisma } from "@calcom/prisma";
import type { Attendee } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";

import type {
  BookingWithAttendees,
  IBookingCreateLog,
  IBookingDeleteLog,
  IBookingLog,
} from "./types/BookingAuditLogTypes";
import { BookingAuditLogOption } from "./types/BookingAuditLogTypes";
import { CRUD } from "./types/CRUD";
import deepDifference from "./util/deepDifference";

export class BookingCreateAuditLogger {
  private actionType: typeof BookingAuditLogOption.BookingCreate = BookingAuditLogOption.BookingCreate;
  private bookingAuditData: IBookingCreateLog = {} as IBookingCreateLog;

  constructor(
    private readonly actorUserId: number,
    private readonly targetBookingWithAttendees: BookingWithAttendees,
    private readonly targetTeamId: number
  ) {
    if (
      !this.targetBookingWithAttendees.eventTypeId ||
      this.targetBookingWithAttendees.status !== BookingStatus.ACCEPTED
    )
      return this;
    this.bookingAuditData = this.bookingCreateDataMaker(
      this.actorUserId,
      this.targetBookingWithAttendees.eventTypeId,
      this.targetBookingWithAttendees.attendees,
      this.targetTeamId
    );
  }

  private bookingCreateDataMaker(
    actorUserId: number,
    targetEventId: number,
    targetAttendees: Attendee[],
    targetTeamId: number
  ): IBookingCreateLog {
    const bookedAttendeesEmails = targetAttendees.map((attendee) => attendee.email);
    return {
      actionType: this.actionType,
      actorUser: { id: actorUserId },
      target: {
        targetEvent: targetEventId,
        targetUsersEmails: bookedAttendeesEmails,
        startTime: this.targetBookingWithAttendees.startTime,
        endTime: this.targetBookingWithAttendees.endTime,
      },
      crud: CRUD.CREATE,
      targetTeam: { id: targetTeamId },
    };
  }

  async log() {
    if (this.bookingAuditData.crud)
      await prisma.auditLog.create({
        data: this.bookingAuditData,
      });
  }
}

export class BookingUpdateAuditLogger {
  private readonly requiredEventTypeChanged = ["status", "location", "startTime", "endTime", "attendees"];
  actionType: typeof BookingAuditLogOption.BookingUpdate = BookingAuditLogOption.BookingUpdate;
  bookingAuditData: IBookingLog[] = [];

  constructor(
    private readonly actorUserId: number,
    private readonly prevBookingWithAttendees: BookingWithAttendees,
    private readonly updatedBookingWithAttendees: BookingWithAttendees,
    private readonly targetTeamId: number
  ) {
    if (this.updatedBookingWithAttendees.status !== BookingStatus.ACCEPTED) return this;
    this.bookingAuditData = this.bookingUpdateDataMaker(
      this.actorUserId,
      this.prevBookingWithAttendees,
      this.updatedBookingWithAttendees,
      this.targetTeamId
    );
  }

  private bookingUpdateDataMaker(
    actorUserId: number,
    prevBookingWithAttendees: BookingWithAttendees,
    updatedBookingWithAttendees: BookingWithAttendees,
    targetTeamId: number
  ): IBookingLog[] {
    const bookingUpdateLog: IBookingLog[] = [];
    const changedAttributes = deepDifference(prevBookingWithAttendees, updatedBookingWithAttendees);
    const changedAttributesList = [];
    for (const key of changedAttributes) {
      if (this.requiredEventTypeChanged.includes(key) && key in updatedBookingWithAttendees) {
        if (key === "attendees") {
          bookingUpdateLog.push(
            ...new BookingUpdateAttendeeAuditLogger(
              actorUserId,
              updatedBookingWithAttendees.id,
              updatedBookingWithAttendees.startTime,
              updatedBookingWithAttendees.endTime,
              prevBookingWithAttendees.attendees,
              updatedBookingWithAttendees.attendees,
              targetTeamId
            ).bookingAuditData
          );
        }

        changedAttributesList.push({
          [key]: updatedBookingWithAttendees[key],
        });
      }
    }

    bookingUpdateLog.push({
      actionType: this.actionType,
      actorUser: { id: actorUserId },
      target: {
        targetEvent: updatedBookingWithAttendees.id,
        startTime: updatedBookingWithAttendees.startTime,
        endTime: updatedBookingWithAttendees.endTime,
        changedAttributes: changedAttributesList,
      },
      crud: CRUD.UPDATE,
      targetTeam: { id: targetTeamId },
    });

    return bookingUpdateLog;
  }

  async log() {
    if (this.bookingAuditData.length > 1)
      await prisma.auditLog.createMany({
        data: this.bookingAuditData,
      });
  }
}

export class BookingUpdateAttendeeAuditLogger {
  bookingAuditData: (IBookingCreateLog | IBookingDeleteLog)[];

  constructor(
    private readonly actorUserId: number,
    private readonly targetEventId: number,
    private readonly startTime: Date,
    private readonly endTime: Date,
    private readonly prevAttendees: Attendee[],
    private readonly updatedAttendees: Attendee[],
    private readonly targetTeamId: number
  ) {
    this.bookingAuditData = this.bookingUpdateAttendeeDataMaker(
      this.actorUserId,
      this.targetEventId,
      this.startTime,
      this.endTime,
      this.prevAttendees,
      this.updatedAttendees,
      this.targetTeamId
    );
  }

  private bookingUpdateAttendeeDataMaker(
    actorUserId: number,
    targetEventId: number,
    startTime: Date,
    endTime: Date,
    prevAttendees: Attendee[],
    updatedAttendees: Attendee[],
    targetTeamId: number
  ): (IBookingCreateLog | IBookingDeleteLog)[] {
    const createdAttendeesLog: IBookingCreateLog[] = [];
    const removedAttendeesLog: IBookingDeleteLog[] = [];
    const newAttendeesEmails = updatedAttendees.slice(prevAttendees.length).map((attendee) => attendee.email);
    const removedAttendeesEmails = differenceWith(prevAttendees, updatedAttendees, isEqual).map(
      (attendee) => attendee.email
    );

    createdAttendeesLog.push({
      actionType: BookingAuditLogOption.BookingCreate,
      actorUser: { id: actorUserId },
      target: {
        targetEvent: targetEventId,
        targetUsersEmails: newAttendeesEmails,
        startTime,
        endTime,
      },
      crud: CRUD.CREATE,
      targetTeam: { id: targetTeamId },
    });

    removedAttendeesLog.push({
      actionType: BookingAuditLogOption.BookingDelete,
      actorUser: { id: actorUserId },
      target: {
        targetEvent: targetEventId,
        targetUsersEmails: removedAttendeesEmails,
        startTime,
        endTime,
      },
      crud: CRUD.DELETE,
      targetTeam: { id: targetTeamId },
    });

    return [...createdAttendeesLog, ...removedAttendeesLog];
  }
}
