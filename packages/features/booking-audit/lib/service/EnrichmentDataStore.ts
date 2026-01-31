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
 * It validates that accessed data was declared in requirements - throws an error
 * if code tries to access data that wasn't declared (catches bugs at runtime).
 */
export class EnrichmentDataStore {
  private usersByUuid: Map<string, StoredUser>;
  private usersById: Map<number, StoredUser>;
  private bookingsByUid: Map<string, StoredBooking>;
  private attendeesById: Map<number, StoredAttendee>;
  private credentialsById: Map<number, StoredCredential>;

  private declaredUserUuids: Set<string>;
  private declaredUserIds: Set<number>;
  private declaredBookingUids: Set<string>;
  private declaredAttendeeIds: Set<number>;
  private declaredCredentialIds: Set<number>;

  constructor(
    data: {
      users?: StoredUser[];
      bookings?: StoredBooking[];
      attendees?: StoredAttendee[];
      credentials?: StoredCredential[];
    },
    declaredRequirements?: DataRequirements
  ) {
    this.usersByUuid = new Map(data.users?.map((u) => [u.uuid, u]) ?? []);
    this.usersById = new Map(data.users?.map((u) => [u.id, u]) ?? []);
    this.bookingsByUid = new Map(data.bookings?.map((b) => [b.uid, b]) ?? []);
    this.attendeesById = new Map(data.attendees?.map((a) => [a.id, a]) ?? []);
    this.credentialsById = new Map(data.credentials?.map((c) => [c.id, c]) ?? []);

    this.declaredUserUuids = new Set(declaredRequirements?.userUuids ?? []);
    this.declaredUserIds = new Set(declaredRequirements?.userIds ?? []);
    this.declaredBookingUids = new Set(declaredRequirements?.bookingUids ?? []);
    this.declaredAttendeeIds = new Set(declaredRequirements?.attendeeIds ?? []);
    this.declaredCredentialIds = new Set(declaredRequirements?.credentialIds ?? []);
  }

  /**
   * Get user by UUID
   * Throws error if UUID was not declared in requirements (bug in getDataRequirements)
   * Returns undefined if user was declared but doesn't exist in database
   */
  getUserByUuid(uuid: string): StoredUser | undefined {
    if (this.declaredUserUuids.size > 0 && !this.declaredUserUuids.has(uuid)) {
      throw new Error(
        `EnrichmentDataStore: getUserByUuid("${uuid}") called but UUID was not declared in getDataRequirements. ` +
          `This is a bug - ensure the action service declares all required userUuids.`
      );
    }
    return this.usersByUuid.get(uuid);
  }

  /**
   * Get user by ID
   * Throws error if ID was not declared in requirements (bug in getDataRequirements)
   * Returns undefined if user was declared but doesn't exist in database
   */
  getUserById(id: number): StoredUser | undefined {
    if (this.declaredUserIds.size > 0 && !this.declaredUserIds.has(id)) {
      throw new Error(
        `EnrichmentDataStore: getUserById(${id}) called but ID was not declared in getDataRequirements. ` +
          `This is a bug - ensure the action service declares all required userIds.`
      );
    }
    return this.usersById.get(id);
  }

  /**
   * Get booking by UID
   * Throws error if UID was not declared in requirements (bug in getDataRequirements)
   * Returns undefined if booking was declared but doesn't exist in database
   */
  getBookingByUid(uid: string): StoredBooking | undefined {
    if (this.declaredBookingUids.size > 0 && !this.declaredBookingUids.has(uid)) {
      throw new Error(
        `EnrichmentDataStore: getBookingByUid("${uid}") called but UID was not declared in getDataRequirements. ` +
          `This is a bug - ensure the action service declares all required bookingUids.`
      );
    }
    return this.bookingsByUid.get(uid);
  }

  /**
   * Get attendee by ID
   * Throws error if ID was not declared in requirements (bug in getDataRequirements)
   * Returns undefined if attendee was declared but doesn't exist in database
   */
  getAttendeeById(id: number): StoredAttendee | undefined {
    if (this.declaredAttendeeIds.size > 0 && !this.declaredAttendeeIds.has(id)) {
      throw new Error(
        `EnrichmentDataStore: getAttendeeById(${id}) called but ID was not declared in getDataRequirements. ` +
          `This is a bug - ensure the action service declares all required attendeeIds.`
      );
    }
    return this.attendeesById.get(id);
  }

  /**
   * Get credential by ID
   * Throws error if ID was not declared in requirements (bug in getDataRequirements)
   * Returns undefined if credential was declared but doesn't exist in database
   */
  getCredentialById(id: number): StoredCredential | undefined {
    if (this.declaredCredentialIds.size > 0 && !this.declaredCredentialIds.has(id)) {
      throw new Error(
        `EnrichmentDataStore: getCredentialById(${id}) called but ID was not declared in getDataRequirements. ` +
          `This is a bug - ensure the action service declares all required credentialIds.`
      );
    }
    return this.credentialsById.get(id);
  }
}
