/**
 * ORM-agnostic interface for BookingReferenceRepository
 * This interface defines the contract for booking reference data access
 * Implementations can use Prisma, Kysely, or any other data access layer
 */

export interface BookingReferenceDto {
  id: number;
  type: string;
  uid: string;
  meetingId: string | null;
  meetingUrl: string | null;
  credentialId: number | null;
  deleted: boolean | null;
  bookingId: number | null;
}

export interface PartialReferenceDto {
  type: string;
  uid?: string;
  meetingId?: string;
  meetingUrl?: string;
  meetingPassword?: string;
  credentialId?: number | null;
  externalCalendarId?: string;
}

export interface IBookingReferenceRepository {
  findDailyVideoReferenceByRoomName(roomName: string): Promise<BookingReferenceDto | null>;
  replaceBookingReferences(params: {
    bookingId: number;
    newReferencesToCreate: PartialReferenceDto[];
  }): Promise<void>;
}
