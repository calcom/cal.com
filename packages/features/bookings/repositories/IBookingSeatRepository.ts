export interface BookingSeatAttendeeDto {
  email: string;
}

export interface BookingSeatAttendeeDetailsDto {
  name: string | null;
  id: number;
  bookingId: number | null;
  noShow: boolean | null;
  phoneNumber: string | null;
  email: string;
  locale: string | null;
  timeZone: string;
}

export interface IBookingSeatRepository {
  getByUidIncludeAttendee(uid: string): Promise<{ attendee: BookingSeatAttendeeDto | null } | null>;

  getByReferenceUidWithAttendeeDetails(
    referenceUid: string
  ): Promise<{ attendee: BookingSeatAttendeeDetailsDto | null } | null>;
}
