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

/**
 * Data requirements that action services can declare
 * Used to collect all identifiers needed before bulk fetching
 */
export type DataRequirements = {
  userIds?: number[];
  userUuids?: string[];
  bookingUids?: string[];
  // Extensible: add more as needed
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

  constructor(data: {
    users?: StoredUser[];
    bookings?: StoredBooking[];
  }) {
    this.usersByUuid = new Map(data.users?.map((u) => [u.uuid, u]) ?? []);
    this.usersById = new Map(data.users?.map((u) => [u.id, u]) ?? []);
    this.bookingsByUid = new Map(data.bookings?.map((b) => [b.uid, b]) ?? []);
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
}
