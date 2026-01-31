import type { EnrichmentDataStore, DataRequirements, StoredUser, StoredAttendee, StoredCredential } from "../../service/EnrichmentDataStore";
import type { IAuditActionService, BaseStoredAuditData } from "../IAuditActionService";

type AccessedData = {
  userUuids: Set<string>;
  attendeeIds: Set<number>;
  credentialIds: Set<number>;
};

function createMockUser(uuid: string): StoredUser {
  return {
    id: Math.floor(Math.random() * 10000),
    uuid,
    name: `User ${uuid}`,
    email: `${uuid}@example.com`,
    avatarUrl: null,
  };
}

function createMockAttendee(id: number): StoredAttendee {
  return {
    id,
    name: `Attendee ${id}`,
    email: `attendee${id}@example.com`,
  };
}

function createMockCredential(id: number): StoredCredential {
  return {
    id,
    appId: `app-${id}`,
  };
}

export function createTrackingDbStore(accessedData: AccessedData): EnrichmentDataStore {
  return {
    getUserByUuid: (uuid: string) => {
      accessedData.userUuids.add(uuid);
      return createMockUser(uuid);
    },
    getAttendeeById: (id: number) => {
      accessedData.attendeeIds.add(id);
      return createMockAttendee(id);
    },
    getCredentialById: (id: number) => {
      accessedData.credentialIds.add(id);
      return createMockCredential(id);
    },
  } as EnrichmentDataStore;
}

export function createEmptyAccessedData(): AccessedData {
  return {
    userUuids: new Set(),
    attendeeIds: new Set(),
    credentialIds: new Set(),
  };
}

/**
 * Creates a mock EnrichmentDataStore for testing purposes.
 * Pre-populates the store with the provided data and validates access against declared requirements.
 */
export function createMockEnrichmentDataStore(
  data: {
    users?: StoredUser[];
    attendees?: StoredAttendee[];
    credentials?: StoredCredential[];
  },
  declaredRequirements: DataRequirements
): EnrichmentDataStore {
  const usersByUuid = new Map<string, StoredUser | null>();
  const attendeesById = new Map<number, StoredAttendee | null>();
  const credentialsById = new Map<number, StoredCredential | null>();

  // Pre-populate with nulls for all declared IDs
  for (const uuid of declaredRequirements.userUuids ?? []) {
    usersByUuid.set(uuid, null);
  }
  for (const id of declaredRequirements.attendeeIds ?? []) {
    attendeesById.set(id, null);
  }
  for (const id of declaredRequirements.credentialIds ?? []) {
    credentialsById.set(id, null);
  }

  // Overwrite with actual data
  for (const user of data.users ?? []) {
    usersByUuid.set(user.uuid, user);
  }
  for (const attendee of data.attendees ?? []) {
    attendeesById.set(attendee.id, attendee);
  }
  for (const credential of data.credentials ?? []) {
    credentialsById.set(credential.id, credential);
  }

  return {
    getUserByUuid: (uuid: string) => {
      if (!usersByUuid.has(uuid)) {
        throw new Error(
          `EnrichmentDataStore: getUserByUuid("${uuid}") called but was not declared in getDataRequirements.`
        );
      }
      return usersByUuid.get(uuid) ?? null;
    },
    getAttendeeById: (id: number) => {
      if (!attendeesById.has(id)) {
        throw new Error(
          `EnrichmentDataStore: getAttendeeById(${id}) called but was not declared in getDataRequirements.`
        );
      }
      return attendeesById.get(id) ?? null;
    },
    getCredentialById: (id: number) => {
      if (!credentialsById.has(id)) {
        throw new Error(
          `EnrichmentDataStore: getCredentialById(${id}) called but was not declared in getDataRequirements.`
        );
      }
      return credentialsById.get(id) ?? null;
    },
  } as EnrichmentDataStore;
}

export async function verifyDataRequirementsContract(
  service: IAuditActionService,
  storedData: BaseStoredAuditData,
  userTimeZone = "UTC"
): Promise<{
  declaredRequirements: DataRequirements;
  accessedData: AccessedData;
  errors: string[];
}> {
  const errors: string[] = [];
  const accessedData = createEmptyAccessedData();
  const trackingDbStore = createTrackingDbStore(accessedData);

  const declaredRequirements = service.getDataRequirements(storedData);

  await service.getDisplayTitle({ storedData, dbStore: trackingDbStore, userTimeZone });

  if (service.getDisplayFields) {
    await service.getDisplayFields({ storedData, dbStore: trackingDbStore });
  }

  for (const uuid of accessedData.userUuids) {
    if (!declaredRequirements.userUuids?.includes(uuid)) {
      errors.push(`Under-declaration: getUserByUuid("${uuid}") was called but not declared in getDataRequirements`);
    }
  }

  for (const uuid of declaredRequirements.userUuids || []) {
    if (!accessedData.userUuids.has(uuid)) {
      errors.push(`Over-declaration: userUuid "${uuid}" was declared but never accessed`);
    }
  }

  for (const id of accessedData.attendeeIds) {
    if (!declaredRequirements.attendeeIds?.includes(id)) {
      errors.push(`Under-declaration: getAttendeeById(${id}) was called but not declared in getDataRequirements`);
    }
  }

  for (const id of declaredRequirements.attendeeIds || []) {
    if (!accessedData.attendeeIds.has(id)) {
      errors.push(`Over-declaration: attendeeId ${id} was declared but never accessed`);
    }
  }

  for (const id of accessedData.credentialIds) {
    if (!declaredRequirements.credentialIds?.includes(id)) {
      errors.push(`Under-declaration: getCredentialById(${id}) was called but not declared in getDataRequirements`);
    }
  }

  for (const id of declaredRequirements.credentialIds || []) {
    if (!accessedData.credentialIds.has(id)) {
      errors.push(`Over-declaration: credentialId ${id} was declared but never accessed`);
    }
  }

  return { declaredRequirements, accessedData, errors };
}
