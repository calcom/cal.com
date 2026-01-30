/**
 * Entity types stored in the enrichment data store
 * These represent the minimal data needed for audit log enrichment
 */

export type StoredUser = {
  id: number;
  uuid: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
};

export type StoredBooking = {
  uid: string;
  title: string;
  // ... other fields as needed
};

export type StoredAttendee = {
  id: number;
  name: string;
  email: string;
};

export type StoredCredential = {
  id: number;
  appId: string | null;
};

/**
 * Data requirements that action services can declare
 * Used to collect all identifiers needed before bulk fetching
 */
export type DataRequirements = {
  userIds?: number[];
  userUuids?: string[];
  bookingUids?: string[];
  attendeeIds?: number[];
  credentialIds?: number[];
};

/**
 * EnrichmentDataStore
 *
 * Holds pre-fetched data for audit log enrichment.
 * Action services use this store instead of making individual DB queries,
 * eliminating N+1 query problems.
 *
 * The store is populated once before enrichment and passed to all action services.
 */
export class EnrichmentDataStore {
  private usersByUuid: Map<string, StoredUser>;
  private usersById: Map<number, StoredUser>;
  private bookingsByUid: Map<string, StoredBooking>;
  private attendeesById: Map<number, StoredAttendee>;
  private credentialsById: Map<number, StoredCredential>;

  constructor(data: {
    users?: StoredUser[];
    bookings?: StoredBooking[];
    attendees?: StoredAttendee[];
    credentials?: StoredCredential[];
  }) {
    this.usersByUuid = new Map(data.users?.map((u) => [u.uuid, u]) ?? []);
    this.usersById = new Map(data.users?.map((u) => [u.id, u]) ?? []);
    this.bookingsByUid = new Map(data.bookings?.map((b) => [b.uid, b]) ?? []);
    this.attendeesById = new Map(data.attendees?.map((a) => [a.id, a]) ?? []);
    this.credentialsById = new Map(data.credentials?.map((c) => [c.id, c]) ?? []);
  }

  /**
   * Get user by UUID
   * Returns undefined if user not found in store
   */
  getUserByUuid(uuid: string): StoredUser | undefined {
    return this.usersByUuid.get(uuid);
  }

  /**
   * Get user by ID
   * Returns undefined if user not found in store
   */
  getUserById(id: number): StoredUser | undefined {
    return this.usersById.get(id);
  }

  /**
   * Get booking by UID
   * Returns undefined if booking not found in store
   */
  getBookingByUid(uid: string): StoredBooking | undefined {
    return this.bookingsByUid.get(uid);
  }

  /**
   * Get attendee by ID
   * Returns undefined if attendee not found in store
   */
  getAttendeeById(id: number): StoredAttendee | undefined {
    return this.attendeesById.get(id);
  }

  /**
   * Get credential by ID
   * Returns undefined if credential not found in store
   */
  getCredentialById(id: number): StoredCredential | undefined {
    return this.credentialsById.get(id);
  }
}
