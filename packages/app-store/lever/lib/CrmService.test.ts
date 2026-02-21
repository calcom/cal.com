import type { CredentialPayload } from "@calcom/types/Credential";
import type { CRM, ContactCreateInput } from "@calcom/types/CrmService";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Create hoisted mocks
const { mockFetch } = vi.hoisted(() => {
  return {
    mockFetch: vi.fn(),
  };
});

// Mock global fetch
vi.stubGlobal("fetch", mockFetch);

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
    }),
  },
}));

import LeverCRMService from "./CrmService";

describe("LeverCRMService", () => {
  let service: CRM;
  const mockAccessToken = "mock_lever_access_token";

  const createMockCredential = (overrides: Partial<CredentialPayload> = {}): CredentialPayload => ({
    id: 1,
    type: "lever_other",
    key: {
      access_token: mockAccessToken,
      refresh_token: "mock_refresh_token",
      expires_at: Date.now() + 3600000,
    },
    userId: 1,
    appId: "lever",
    teamId: null,
    invalid: false,
    user: { email: "test-user@example.com" },
    delegationCredentialId: null,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    service = new (LeverCRMService as unknown as new (credential: CredentialPayload) => CRM)(
      createMockCredential()
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with valid credentials", () => {
      expect(service).toBeDefined();
    });

    it("should throw error with invalid credentials", () => {
      const invalidCredential = createMockCredential({
        key: { invalid: "key" },
      });

      expect(
        () =>
          new (LeverCRMService as unknown as new (credential: CredentialPayload) => CRM)(invalidCredential)
      ).toThrow("Invalid Lever credentials");
    });

    it("should throw error with missing access_token", () => {
      const invalidCredential = createMockCredential({
        key: { refresh_token: "token" },
      });

      expect(
        () =>
          new (LeverCRMService as unknown as new (credential: CredentialPayload) => CRM)(invalidCredential)
      ).toThrow("Invalid Lever credentials");
    });
  });

  describe("createContact", () => {
    it("should create a candidate successfully", async () => {
      const mockResponse = {
        data: {
          id: "candidate-123",
          name: "John Doe",
          emails: ["john@example.com"],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const contact: ContactCreateInput = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "+1234567890",
      };

      const result = await service.createContact(contact);

      expect(result).toEqual({
        id: "candidate-123",
        email: "john@example.com",
        firstName: "John",
        lastName: "Doe",
      });

      expect(mockFetch).toHaveBeenCalledWith("https://api.lever.co/v1/candidates", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mockAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "John Doe",
          emails: ["john@example.com"],
          phones: [{ type: "other", value: "+1234567890" }],
          origin: "other",
          tags: ["cal.com"],
        }),
      });
    });

    it("should handle contact creation without phone number", async () => {
      const mockResponse = {
        data: {
          id: "candidate-456",
          name: "Jane Smith",
          emails: ["jane@example.com"],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const contact: ContactCreateInput = {
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
      };

      const result = await service.createContact(contact);

      expect(result.id).toBe("candidate-456");

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.phones).toEqual([]);
    });

    it("should handle contact creation with only first name", async () => {
      const mockResponse = {
        data: {
          id: "candidate-789",
          name: "John",
          emails: ["john@example.com"],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const contact: ContactCreateInput = {
        firstName: "John",
        email: "john@example.com",
      };

      await service.createContact(contact);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.name).toBe("John");
    });

    it("should return empty contact on API error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      });

      const contact: ContactCreateInput = {
        firstName: "Error",
        lastName: "Test",
        email: "error@example.com",
      };

      const result = await service.createContact(contact);

      expect(result).toEqual({
        id: "",
        email: "error@example.com",
        firstName: "Error",
        lastName: "Test",
      });
    });

    it("should handle network errors gracefully", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const contact: ContactCreateInput = {
        firstName: "Network",
        lastName: "Error",
        email: "network@example.com",
      };

      const result = await service.createContact(contact);

      expect(result.id).toBe("");
    });
  });

  describe("getContacts", () => {
    it("should find contacts by email", async () => {
      const mockResponse = {
        data: [
          {
            id: "candidate-123",
            name: "John Doe",
            emails: ["john@example.com"],
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.getContacts("john@example.com");

      expect(result).toEqual([
        {
          id: "candidate-123",
          email: "john@example.com",
          firstName: "John",
          lastName: "Doe",
        },
      ]);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.lever.co/v1/candidates?email=john%40example.com",
        expect.objectContaining({
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
            "Content-Type": "application/json",
          },
        })
      );
    });

    it("should handle multiple email search", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [{ id: "candidate-1", name: "John Doe", emails: ["john@example.com"] }],
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [{ id: "candidate-2", name: "Jane Smith", emails: ["jane@example.com"] }],
            }),
        });

      const result = await service.getContacts(["john@example.com", "jane@example.com"]);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("candidate-1");
      expect(result[1].id).toBe("candidate-2");
    });

    it("should return empty array when no contacts found", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      const result = await service.getContacts("nonexistent@example.com");

      expect(result).toEqual([]);
    });

    it("should handle API errors gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve("Unauthorized"),
      });

      const result = await service.getContacts("error@example.com");

      expect(result).toEqual([]);
    });

    it("should handle candidates with single name (no last name)", async () => {
      const mockResponse = {
        data: [
          {
            id: "candidate-single",
            name: "Madonna",
            emails: ["madonna@example.com"],
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.getContacts("madonna@example.com");

      expect(result[0].firstName).toBe("Madonna");
      expect(result[0].lastName).toBe("");
    });

    it("should handle candidates with multiple part names", async () => {
      const mockResponse = {
        data: [
          {
            id: "candidate-multi",
            name: "Jean Claude Van Damme",
            emails: ["jcvd@example.com"],
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.getContacts("jcvd@example.com");

      expect(result[0].firstName).toBe("Jean");
      expect(result[0].lastName).toBe("Claude Van Damme");
    });
  });

  describe("updateContact", () => {
    it("should update a candidate successfully", async () => {
      const mockResponse = {
        data: {
          id: "candidate-123",
          name: "John Updated",
          emails: ["john.updated@example.com"],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const contact: ContactCreateInput = {
        firstName: "John",
        lastName: "Updated",
        email: "john.updated@example.com",
        phone: "+9876543210",
      };

      const result = await service.updateContact("candidate-123", contact);

      expect(result).toEqual({
        id: "candidate-123",
        email: "john.updated@example.com",
        firstName: "John",
        lastName: "Updated",
      });

      expect(mockFetch).toHaveBeenCalledWith("https://api.lever.co/v1/candidates/candidate-123", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${mockAccessToken}`,
          "Content-Type": "application/json",
        },
        body: expect.any(String),
      });
    });

    it("should throw error on update failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve("Candidate not found"),
      });

      const contact: ContactCreateInput = {
        firstName: "Not",
        lastName: "Found",
        email: "notfound@example.com",
      };

      await expect(service.updateContact("nonexistent-id", contact)).rejects.toThrow("Lever API error: 404");
    });
  });

  describe("deleteContact", () => {
    it("should archive a candidate successfully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: "candidate-123" } }),
      });

      await service.deleteContact("candidate-123");

      expect(mockFetch).toHaveBeenCalledWith("https://api.lever.co/v1/candidates/candidate-123/archive", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mockAccessToken}`,
          "Content-Type": "application/json",
        },
      });
    });

    it("should handle archive errors gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve("Candidate not found"),
      });

      // Should not throw
      await expect(service.deleteContact("nonexistent-id")).resolves.toBeUndefined();
    });
  });

  describe("API authentication", () => {
    it("should include Bearer token in all requests", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      await service.getContacts("test@example.com");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockAccessToken}`,
          }),
        })
      );
    });
  });

  describe("Edge cases", () => {
    it("should handle empty email in contact creation", async () => {
      const mockResponse = {
        data: {
          id: "candidate-no-email",
          name: "No Email",
          emails: [],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const contact: ContactCreateInput = {
        firstName: "No",
        lastName: "Email",
        email: "",
      };

      const result = await service.createContact(contact);

      expect(result.email).toBe("");
    });

    it("should handle candidate without emails in response", async () => {
      const mockResponse = {
        data: [
          {
            id: "candidate-no-emails",
            name: "Test User",
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await service.getContacts("test@example.com");

      expect(result[0].email).toBe("test@example.com"); // Falls back to search email
    });

    it("should handle rate limiting (429 status)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: () => Promise.resolve("Rate limit exceeded"),
      });

      const result = await service.getContacts("ratelimit@example.com");

      expect(result).toEqual([]);
    });
  });
});
