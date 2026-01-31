import type { IAttendeeRepository } from "@calcom/features/bookings/repositories/IAttendeeRepository";
import type { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";
import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";

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
  userUuids?: string[];
  attendeeIds?: number[];
  credentialIds?: number[];
};

/**
 * Mapper functions to ensure only defined properties are stored avoiding unnecessary memory usage
 * These functions extract only the properties defined in StoredUser, StoredAttendee, and StoredCredential
 * Accepts broader types that extend the stored types (allowing additional properties)
 */
function mapToStoredUser<T extends StoredUser>(user: T): StoredUser {
  return {
    id: user.id,
    uuid: user.uuid,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
  };
}

function mapToStoredAttendee<T extends StoredAttendee>(attendee: T): StoredAttendee {
  return {
    id: attendee.id,
    name: attendee.name,
    email: attendee.email,
  };
}

function mapToStoredCredential<T extends StoredCredential>(credential: T): StoredCredential {
  return {
    id: credential.id,
    appId: credential.appId,
  };
}

/**
 * Repository dependencies for fetching data
 */
export interface EnrichmentDataStoreRepositories {
  userRepository: UserRepository;
  attendeeRepository: IAttendeeRepository;
  credentialRepository: CredentialRepository;
}

/**
 * EnrichmentDataStore
 *
 * Holds pre-fetched data for audit log enrichment.
 * Action services use this store instead of making individual DB queries,
 * eliminating N+1 query problems.
 *
 * The store validates that accessed data was declared in requirements - throws an error
 * if code tries to access data that wasn't declared (catches bugs at runtime).
 *
 * Usage:
 * ```
 * const store = new EnrichmentDataStore(requirements, repositories);
 * await store.fetch();
 * const user = store.getUserByUuid("uuid"); // throws if "uuid" wasn't declared
 * ```
 */
export class EnrichmentDataStore {
  private usersByUuid: Map<string, StoredUser | null> = new Map();
  private attendeesById: Map<number, StoredAttendee | null> = new Map();
  private credentialsById: Map<number, StoredCredential | null> = new Map();

  constructor(
    private requirements: DataRequirements,
    private repositories: EnrichmentDataStoreRepositories
  ) {
    // Pre-populate maps with null for all declared IDs
    // This marks them as "declared" - the key exists, but data not yet fetched
    for (const uuid of requirements.userUuids ?? []) {
      this.usersByUuid.set(uuid, null);
    }
    for (const id of requirements.attendeeIds ?? []) {
      this.attendeesById.set(id, null);
    }
    for (const id of requirements.credentialIds ?? []) {
      this.credentialsById.set(id, null);
    }
  }

  /**
   * Fetch all declared data from the database
   * Must be called before using any getter methods
   */
  async fetch(): Promise<void> {
    const [users, attendees, credentials] = await Promise.all([
      this.requirements.userUuids?.length
        ? this.repositories.userRepository.findByUuids({ uuids: this.requirements.userUuids })
        : [],
      this.requirements.attendeeIds?.length
        ? this.repositories.attendeeRepository.findByIds({ ids: this.requirements.attendeeIds })
        : [],
      this.requirements.credentialIds?.length
        ? this.repositories.credentialRepository.findByIds({ ids: this.requirements.credentialIds })
        : [],
    ]);

    // Overwrite nulls with actual data from DB, using mappers to ensure only defined properties are stored
    for (const user of users) {
      this.usersByUuid.set(user.uuid, mapToStoredUser(user));
    }
    for (const attendee of attendees) {
      this.attendeesById.set(attendee.id, mapToStoredAttendee(attendee));
    }
    for (const credential of credentials) {
      this.credentialsById.set(credential.id, mapToStoredCredential(credential));
    }
  }

  /**
   * Get user by UUID
   * Throws error if UUID was not declared in requirements (bug in getDataRequirements)
   * Returns null if user was declared but doesn't exist in database
   */
  getUserByUuid(uuid: string): StoredUser | null {
    if (!this.usersByUuid.has(uuid)) {
      throw new Error(
        `EnrichmentDataStore: getUserByUuid("${uuid}") called but was not declared in getDataRequirements. ` +
          `This is a bug - ensure the action service declares all required userUuids.`
      );
    }
    return this.usersByUuid.get(uuid) ?? null;
  }

  /**
   * Get attendee by ID
   * Throws error if ID was not declared in requirements (bug in getDataRequirements)
   * Returns null if attendee was declared but doesn't exist in database
   */
  getAttendeeById(id: number): StoredAttendee | null {
    if (!this.attendeesById.has(id)) {
      throw new Error(
        `EnrichmentDataStore: getAttendeeById(${id}) called but was not declared in getDataRequirements. ` +
          `This is a bug - ensure the action service declares all required attendeeIds.`
      );
    }
    return this.attendeesById.get(id) ?? null;
  }

  /**
   * Get credential by ID
   * Throws error if ID was not declared in requirements (bug in getDataRequirements)
   * Returns null if credential was declared but doesn't exist in database
   */
  getCredentialById(id: number): StoredCredential | null {
    if (!this.credentialsById.has(id)) {
      throw new Error(
        `EnrichmentDataStore: getCredentialById(${id}) called but was not declared in getDataRequirements. ` +
          `This is a bug - ensure the action service declares all required credentialIds.`
      );
    }
    return this.credentialsById.get(id) ?? null;
  }
}
