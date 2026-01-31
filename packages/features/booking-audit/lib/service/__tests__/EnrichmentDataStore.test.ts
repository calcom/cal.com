import { beforeEach, describe, expect, it, vi } from "vitest";

import type { IAttendeeRepository } from "@calcom/features/bookings/repositories/IAttendeeRepository";
import type { CredentialRepository } from "@calcom/features/credentials/repositories/CredentialRepository";
import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";

import { EnrichmentDataStore } from "../EnrichmentDataStore";

describe("EnrichmentDataStore", () => {
  const mockUserRepository = {
    findByUuids: vi.fn(),
  } as unknown as UserRepository;

  const mockAttendeeRepository = {
    findByIds: vi.fn(),
  } as unknown as IAttendeeRepository;

  const mockCredentialRepository = {
    findByIds: vi.fn(),
  } as unknown as CredentialRepository;

  const repositories = {
    userRepository: mockUserRepository,
    attendeeRepository: mockAttendeeRepository,
    credentialRepository: mockCredentialRepository,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should pre-populate usersByUuid map with nulls for declared userUuids", () => {
      const store = new EnrichmentDataStore(
        { userUuids: ["uuid-1", "uuid-2"] },
        repositories
      );

      expect(() => store.getUserByUuid("uuid-1")).not.toThrow();
      expect(() => store.getUserByUuid("uuid-2")).not.toThrow();
      expect(store.getUserByUuid("uuid-1")).toBeNull();
      expect(store.getUserByUuid("uuid-2")).toBeNull();
    });

    it("should pre-populate attendeesById map with nulls for declared attendeeIds", () => {
      const store = new EnrichmentDataStore(
        { attendeeIds: [1, 2, 3] },
        repositories
      );

      expect(() => store.getAttendeeById(1)).not.toThrow();
      expect(() => store.getAttendeeById(2)).not.toThrow();
      expect(() => store.getAttendeeById(3)).not.toThrow();
      expect(store.getAttendeeById(1)).toBeNull();
    });

    it("should pre-populate credentialsById map with nulls for declared credentialIds", () => {
      const store = new EnrichmentDataStore(
        { credentialIds: [10, 20] },
        repositories
      );

      expect(() => store.getCredentialById(10)).not.toThrow();
      expect(() => store.getCredentialById(20)).not.toThrow();
      expect(store.getCredentialById(10)).toBeNull();
    });

    it("should handle empty requirements", () => {
      const store = new EnrichmentDataStore({}, repositories);

      expect(() => store.getUserByUuid("any-uuid")).toThrow();
      expect(() => store.getAttendeeById(1)).toThrow();
      expect(() => store.getCredentialById(1)).toThrow();
    });
  });

  describe("fetch", () => {
    it("should fetch users from repository and populate the map", async () => {
      const mockUsers = [
        { id: 1, uuid: "uuid-1", name: "User 1", email: "user1@example.com", avatarUrl: null },
        { id: 2, uuid: "uuid-2", name: "User 2", email: "user2@example.com", avatarUrl: "avatar.jpg" },
      ];
      vi.mocked(mockUserRepository.findByUuids).mockResolvedValue(mockUsers);

      const store = new EnrichmentDataStore(
        { userUuids: ["uuid-1", "uuid-2"] },
        repositories
      );
      await store.fetch();

      expect(mockUserRepository.findByUuids).toHaveBeenCalledWith({ uuids: ["uuid-1", "uuid-2"] });
      expect(store.getUserByUuid("uuid-1")).toEqual(mockUsers[0]);
      expect(store.getUserByUuid("uuid-2")).toEqual(mockUsers[1]);
    });

    it("should fetch attendees from repository and populate the map", async () => {
      const mockAttendees = [
        { id: 1, name: "Attendee 1", email: "attendee1@example.com" },
        { id: 2, name: "Attendee 2", email: "attendee2@example.com" },
      ];
      vi.mocked(mockAttendeeRepository.findByIds).mockResolvedValue(mockAttendees);

      const store = new EnrichmentDataStore(
        { attendeeIds: [1, 2] },
        repositories
      );
      await store.fetch();

      expect(mockAttendeeRepository.findByIds).toHaveBeenCalledWith({ ids: [1, 2] });
      expect(store.getAttendeeById(1)).toEqual(mockAttendees[0]);
      expect(store.getAttendeeById(2)).toEqual(mockAttendees[1]);
    });

    it("should fetch credentials from repository and populate the map", async () => {
      const mockCredentials = [
        { id: 10, appId: "google-calendar" },
        { id: 20, appId: "zoom" },
      ];
      vi.mocked(mockCredentialRepository.findByIds).mockResolvedValue(mockCredentials);

      const store = new EnrichmentDataStore(
        { credentialIds: [10, 20] },
        repositories
      );
      await store.fetch();

      expect(mockCredentialRepository.findByIds).toHaveBeenCalledWith({ ids: [10, 20] });
      expect(store.getCredentialById(10)).toEqual(mockCredentials[0]);
      expect(store.getCredentialById(20)).toEqual(mockCredentials[1]);
    });

    it("should fetch all data types in parallel", async () => {
      vi.mocked(mockUserRepository.findByUuids).mockResolvedValue([
        { id: 1, uuid: "uuid-1", name: "User", email: "user@example.com", avatarUrl: null },
      ]);
      vi.mocked(mockAttendeeRepository.findByIds).mockResolvedValue([
        { id: 1, name: "Attendee", email: "attendee@example.com" },
      ]);
      vi.mocked(mockCredentialRepository.findByIds).mockResolvedValue([
        { id: 10, appId: "app" },
      ]);

      const store = new EnrichmentDataStore(
        { userUuids: ["uuid-1"], attendeeIds: [1], credentialIds: [10] },
        repositories
      );
      await store.fetch();

      expect(mockUserRepository.findByUuids).toHaveBeenCalled();
      expect(mockAttendeeRepository.findByIds).toHaveBeenCalled();
      expect(mockCredentialRepository.findByIds).toHaveBeenCalled();
    });

    it("should not call repository if no IDs are declared", async () => {
      const store = new EnrichmentDataStore({}, repositories);
      await store.fetch();

      expect(mockUserRepository.findByUuids).not.toHaveBeenCalled();
      expect(mockAttendeeRepository.findByIds).not.toHaveBeenCalled();
      expect(mockCredentialRepository.findByIds).not.toHaveBeenCalled();
    });

    it("should leave null for declared IDs that are not found in database", async () => {
      vi.mocked(mockUserRepository.findByUuids).mockResolvedValue([
        { id: 1, uuid: "uuid-1", name: "User 1", email: "user1@example.com", avatarUrl: null },
      ]);

      const store = new EnrichmentDataStore(
        { userUuids: ["uuid-1", "uuid-2", "uuid-3"] },
        repositories
      );
      await store.fetch();

      expect(store.getUserByUuid("uuid-1")).not.toBeNull();
      expect(store.getUserByUuid("uuid-2")).toBeNull();
      expect(store.getUserByUuid("uuid-3")).toBeNull();
    });
  });

  describe("getUserByUuid", () => {
    it("should throw error when accessing undeclared UUID", () => {
      const store = new EnrichmentDataStore(
        { userUuids: ["uuid-1"] },
        repositories
      );

      expect(() => store.getUserByUuid("undeclared-uuid")).toThrow(
        'EnrichmentDataStore: getUserByUuid("undeclared-uuid") called but was not declared in getDataRequirements'
      );
    });

    it("should return null for declared UUID that does not exist in database", async () => {
      vi.mocked(mockUserRepository.findByUuids).mockResolvedValue([]);

      const store = new EnrichmentDataStore(
        { userUuids: ["uuid-1"] },
        repositories
      );
      await store.fetch();

      expect(store.getUserByUuid("uuid-1")).toBeNull();
    });

    it("should return user data for declared UUID that exists in database", async () => {
      const mockUser = { id: 1, uuid: "uuid-1", name: "Test User", email: "test@example.com", avatarUrl: null };
      vi.mocked(mockUserRepository.findByUuids).mockResolvedValue([mockUser]);

      const store = new EnrichmentDataStore(
        { userUuids: ["uuid-1"] },
        repositories
      );
      await store.fetch();

      expect(store.getUserByUuid("uuid-1")).toEqual(mockUser);
    });
  });

  describe("getAttendeeById", () => {
    it("should throw error when accessing undeclared attendee ID", () => {
      const store = new EnrichmentDataStore(
        { attendeeIds: [1] },
        repositories
      );

      expect(() => store.getAttendeeById(999)).toThrow(
        "EnrichmentDataStore: getAttendeeById(999) called but was not declared in getDataRequirements"
      );
    });

    it("should return null for declared ID that does not exist in database", async () => {
      vi.mocked(mockAttendeeRepository.findByIds).mockResolvedValue([]);

      const store = new EnrichmentDataStore(
        { attendeeIds: [1] },
        repositories
      );
      await store.fetch();

      expect(store.getAttendeeById(1)).toBeNull();
    });

    it("should return attendee data for declared ID that exists in database", async () => {
      const mockAttendee = { id: 1, name: "Test Attendee", email: "attendee@example.com" };
      vi.mocked(mockAttendeeRepository.findByIds).mockResolvedValue([mockAttendee]);

      const store = new EnrichmentDataStore(
        { attendeeIds: [1] },
        repositories
      );
      await store.fetch();

      expect(store.getAttendeeById(1)).toEqual(mockAttendee);
    });
  });

  describe("getCredentialById", () => {
    it("should throw error when accessing undeclared credential ID", () => {
      const store = new EnrichmentDataStore(
        { credentialIds: [10] },
        repositories
      );

      expect(() => store.getCredentialById(999)).toThrow(
        "EnrichmentDataStore: getCredentialById(999) called but was not declared in getDataRequirements"
      );
    });

    it("should return null for declared ID that does not exist in database", async () => {
      vi.mocked(mockCredentialRepository.findByIds).mockResolvedValue([]);

      const store = new EnrichmentDataStore(
        { credentialIds: [10] },
        repositories
      );
      await store.fetch();

      expect(store.getCredentialById(10)).toBeNull();
    });

    it("should return credential data for declared ID that exists in database", async () => {
      const mockCredential = { id: 10, appId: "google-calendar" };
      vi.mocked(mockCredentialRepository.findByIds).mockResolvedValue([mockCredential]);

      const store = new EnrichmentDataStore(
        { credentialIds: [10] },
        repositories
      );
      await store.fetch();

      expect(store.getCredentialById(10)).toEqual(mockCredential);
    });
  });

  describe("multiple IDs", () => {
    it("should handle multiple user UUIDs correctly", async () => {
      const mockUsers = [
        { id: 1, uuid: "uuid-1", name: "User 1", email: "user1@example.com", avatarUrl: null },
        { id: 2, uuid: "uuid-2", name: "User 2", email: "user2@example.com", avatarUrl: null },
        { id: 3, uuid: "uuid-3", name: "User 3", email: "user3@example.com", avatarUrl: null },
      ];
      vi.mocked(mockUserRepository.findByUuids).mockResolvedValue(mockUsers);

      const store = new EnrichmentDataStore(
        { userUuids: ["uuid-1", "uuid-2", "uuid-3"] },
        repositories
      );
      await store.fetch();

      expect(store.getUserByUuid("uuid-1")).toEqual(mockUsers[0]);
      expect(store.getUserByUuid("uuid-2")).toEqual(mockUsers[1]);
      expect(store.getUserByUuid("uuid-3")).toEqual(mockUsers[2]);
    });

    it("should handle mixed found and not-found IDs", async () => {
      vi.mocked(mockUserRepository.findByUuids).mockResolvedValue([
        { id: 1, uuid: "uuid-1", name: "User 1", email: "user1@example.com", avatarUrl: null },
      ]);
      vi.mocked(mockAttendeeRepository.findByIds).mockResolvedValue([
        { id: 2, name: "Attendee 2", email: "attendee2@example.com" },
      ]);
      vi.mocked(mockCredentialRepository.findByIds).mockResolvedValue([]);

      const store = new EnrichmentDataStore(
        {
          userUuids: ["uuid-1", "uuid-missing"],
          attendeeIds: [1, 2],
          credentialIds: [10],
        },
        repositories
      );
      await store.fetch();

      expect(store.getUserByUuid("uuid-1")).not.toBeNull();
      expect(store.getUserByUuid("uuid-missing")).toBeNull();
      expect(store.getAttendeeById(1)).toBeNull();
      expect(store.getAttendeeById(2)).not.toBeNull();
      expect(store.getCredentialById(10)).toBeNull();
    });
  });
});
