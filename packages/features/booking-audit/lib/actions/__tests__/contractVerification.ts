import type { EnrichmentDataStore, DataRequirements, StoredUser, StoredAttendee, StoredCredential } from "../../service/EnrichmentDataStore";
import type { IAuditActionService, BaseStoredAuditData } from "../IAuditActionService";

type AccessedData = {
  userUuids: Set<string>;
  userIds: Set<number>;
  attendeeIds: Set<number>;
  credentialIds: Set<number>;
  bookingUids: Set<string>;
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
    getUserById: (id: number) => {
      accessedData.userIds.add(id);
      return createMockUser(`user-${id}`);
    },
    getAttendeeById: (id: number) => {
      accessedData.attendeeIds.add(id);
      return createMockAttendee(id);
    },
    getCredentialById: (id: number) => {
      accessedData.credentialIds.add(id);
      return createMockCredential(id);
    },
    getBookingByUid: (uid: string) => {
      accessedData.bookingUids.add(uid);
      return { uid, title: `Booking ${uid}` };
    },
  } as EnrichmentDataStore;
}

export function createEmptyAccessedData(): AccessedData {
  return {
    userUuids: new Set(),
    userIds: new Set(),
    attendeeIds: new Set(),
    credentialIds: new Set(),
    bookingUids: new Set(),
  };
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
