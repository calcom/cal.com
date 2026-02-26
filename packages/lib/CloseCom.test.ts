import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    }),
  },
}));

vi.mock("@calcom/prisma", () => ({
  default: {
    credential: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import CloseCom, { closeComQueries } from "./CloseCom";

describe("closeComQueries", () => {
  describe("contact.search", () => {
    it("builds a search query for a single email", () => {
      const result = closeComQueries.contact.search(["test@example.com"]);

      expect(result.limit).toBeNull();
      expect(result._fields).toEqual({ contact: ["id", "name", "emails"] });
      expect(result.query.type).toBe("and");
      expect(result.query.queries).toHaveLength(2);

      // Check the inner or query contains the email condition
      const innerAndQuery = result.query.queries![1] as { queries: { related_query: { queries: unknown[] } }[] };
      const relatedQuery = innerAndQuery.queries[0].related_query;
      expect(relatedQuery.type).toBe("or");
      expect(relatedQuery.queries).toHaveLength(1);
    });

    it("builds a search query for multiple emails", () => {
      const result = closeComQueries.contact.search(["a@test.com", "b@test.com", "c@test.com"]);

      const innerAndQuery = result.query.queries![1] as { queries: { related_query: { queries: unknown[] } }[] };
      const relatedQuery = innerAndQuery.queries[0].related_query;
      expect(relatedQuery.queries).toHaveLength(3);
    });

    it("builds a search query with empty emails array", () => {
      const result = closeComQueries.contact.search([]);

      const innerAndQuery = result.query.queries![1] as { queries: { related_query: { queries: unknown[] } }[] };
      const relatedQuery = innerAndQuery.queries[0].related_query;
      expect(relatedQuery.queries).toHaveLength(0);
    });

    it("includes correct field_condition structure for each email", () => {
      const result = closeComQueries.contact.search(["user@test.com"]);

      const innerAndQuery = result.query.queries![1] as { queries: { related_query: { queries: unknown[] } }[] };
      const conditions = innerAndQuery.queries[0].related_query.queries;
      const condition = conditions[0] as {
        condition: { mode: string; type: string; value: string };
        field: { field_name: string; object_type: string; type: string };
        negate: boolean;
        type: string;
      };

      expect(condition.condition.mode).toBe("full_words");
      expect(condition.condition.type).toBe("text");
      expect(condition.condition.value).toBe("user@test.com");
      expect(condition.field.field_name).toBe("email");
      expect(condition.field.object_type).toBe("contact_email");
      expect(condition.negate).toBe(false);
      expect(condition.type).toBe("field_condition");
    });
  });

  describe("contact.create", () => {
    it("creates contact data with name", () => {
      const result = closeComQueries.contact.create({
        person: { name: "John Doe", email: "john@test.com" },
        leadId: "lead_123",
      });

      expect(result).toEqual({
        lead_id: "lead_123",
        name: "John Doe",
        emails: [{ email: "john@test.com", type: "office" }],
      });
    });

    it("falls back to email when name is null", () => {
      const result = closeComQueries.contact.create({
        person: { name: null, email: "noname@test.com" },
        leadId: "lead_456",
      });

      expect(result.name).toBe("noname@test.com");
    });
  });

  describe("contact.update", () => {
    it("updates contact with leadId", () => {
      const result = closeComQueries.contact.update({
        person: { name: "Jane", email: "jane@test.com" },
        leadId: "lead_789",
      });

      expect(result).toEqual({
        lead_id: "lead_789",
        name: "Jane",
        emails: [{ email: "jane@test.com", type: "office" }],
      });
    });

    it("omits lead_id when not provided", () => {
      const result = closeComQueries.contact.update({
        person: { name: "Jane", email: "jane@test.com" },
      });

      expect(result).not.toHaveProperty("lead_id");
      expect(result.name).toBe("Jane");
    });
  });

  describe("lead.create", () => {
    it("creates lead with company name only", () => {
      const result = closeComQueries.lead.create({
        companyName: "Acme Inc",
      });

      expect(result).toEqual({ name: "Acme Inc" });
    });

    it("includes description when provided", () => {
      const result = closeComQueries.lead.create({
        companyName: "Acme Inc",
        description: "A test lead",
      });

      expect(result).toEqual({
        name: "Acme Inc",
        description: "A test lead",
      });
    });

    it("includes contacts when both email and name provided", () => {
      const result = closeComQueries.lead.create({
        companyName: "Acme Inc",
        contactEmail: "contact@acme.com",
        contactName: "Contact Person",
      });

      expect(result.contacts).toHaveLength(1);
      expect(result.contacts![0].name).toBe("Contact Person");
      expect(result.contacts![0].email).toBe("contact@acme.com");
      expect(result.contacts![0].emails).toEqual([{ type: "office", email: "contact@acme.com" }]);
    });

    it("omits contacts when email is missing", () => {
      const result = closeComQueries.lead.create({
        companyName: "Acme Inc",
        contactName: "Contact Person",
      });

      expect(result).not.toHaveProperty("contacts");
    });

    it("omits contacts when name is missing", () => {
      const result = closeComQueries.lead.create({
        companyName: "Acme Inc",
        contactEmail: "contact@acme.com",
      });

      expect(result).not.toHaveProperty("contacts");
    });
  });

  describe("customActivity.type.create", () => {
    it("creates custom activity type", () => {
      const result = closeComQueries.customActivity.type.create({
        name: "Cal.com Activity",
        description: "Bookings from Cal.com",
      });

      expect(result).toEqual({
        name: "Cal.com Activity",
        description: "Bookings from Cal.com",
        api_create_only: false,
        editable_with_roles: ["admin"],
      });
    });
  });

  describe("customField.activity.create", () => {
    it("creates custom activity field", () => {
      const result = closeComQueries.customField.activity.create({
        custom_activity_type_id: "actitype_123",
        name: "Attendee",
        type: "text",
        required: true,
        accepts_multiple_values: false,
        editable_with_roles: [],
      });

      expect(result).toEqual({
        custom_activity_type_id: "actitype_123",
        name: "Attendee",
        type: "text",
        required: true,
        accepts_multiple_values: false,
        editable_with_roles: [],
      });
    });
  });
});

describe("CloseCom class", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("constructor", () => {
    it("creates instance with API key", () => {
      const instance = new CloseCom("test-api-key");
      expect(instance).toBeDefined();
    });

    it("creates instance with OAuth options", () => {
      const instance = new CloseCom("test-token", {
        refresh_token: "refresh_abc",
        expires_at: Date.now() + 3600000,
        isOAuth: true,
        userId: 1,
      });
      expect(instance).toBeDefined();
    });
  });

  describe("me", () => {
    it("calls GET /me/", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "user_1", email: "test@close.com" }),
      });

      const instance = new CloseCom("test-api-key");
      const result = await instance.me();

      expect(result).toEqual({ id: "user_1", email: "test@close.com" });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/me/"),
        expect.objectContaining({
          method: "get",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });
  });

  describe("API key authentication", () => {
    it("uses Basic auth header with API key", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const instance = new CloseCom("my-api-key");
      await instance.me();

      const expectedAuth = `Basic ${Buffer.from("my-api-key:").toString("base64")}`;
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expectedAuth,
          }),
        })
      );
    });
  });

  describe("OAuth authentication", () => {
    it("uses Bearer auth header with OAuth token", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const instance = new CloseCom("oauth-token", {
        isOAuth: true,
        expires_at: Date.now() + 3600000, // 1 hour from now
      });
      await instance.me();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer oauth-token",
          }),
        })
      );
    });
  });

  describe("error handling", () => {
    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: "Unauthorized" }),
      });

      const instance = new CloseCom("bad-key");
      await expect(instance.me()).rejects.toThrow("[Close.com app] An error has occurred: 401");
    });

    it("throws on 500 error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Internal Server Error" }),
      });

      const instance = new CloseCom("test-key");
      await expect(instance.me()).rejects.toThrow("[Close.com app] An error has occurred: 500");
    });
  });

  describe("contact methods", () => {
    it("contact.search calls POST /data/search/", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [], cursor: null }),
      });

      const instance = new CloseCom("test-key");
      const result = await instance.contact.search({ emails: ["test@test.com"] });

      expect(result).toEqual({ data: [], cursor: null });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/data/search/"),
        expect.objectContaining({ method: "post" })
      );
    });

    it("contact.create calls POST /contact/", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: "cont_1",
            name: "John",
            emails: [{ email: "john@test.com" }],
          }),
      });

      const instance = new CloseCom("test-key");
      const result = await instance.contact.create({
        person: { name: "John", email: "john@test.com" },
        leadId: "lead_1",
      });

      expect(result.id).toBe("cont_1");
    });

    it("contact.delete calls DELETE /contact/:id/", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const instance = new CloseCom("test-key");
      await instance.contact.delete("cont_123");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/contact/cont_123/"),
        expect.objectContaining({ method: "delete" })
      );
    });
  });

  describe("lead methods", () => {
    it("lead.create calls POST /lead/", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "lead_new", name: "From Cal.com" }),
      });

      const instance = new CloseCom("test-key");
      const result = await instance.lead.create({ companyName: "From Cal.com" });

      expect(result.id).toBe("lead_new");
    });

    it("lead.list calls GET /lead", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });

      const instance = new CloseCom("test-key");
      await instance.lead.list({ query: { _fields: ["name", "id"] } });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/lead"),
        expect.objectContaining({ method: "get" })
      );
    });

    it("lead.delete calls DELETE /lead/:id/", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const instance = new CloseCom("test-key");
      await instance.lead.delete("lead_123");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/lead/lead_123/"),
        expect.objectContaining({ method: "delete" })
      );
    });
  });

  describe("customActivity methods", () => {
    it("customActivity.type.get calls GET /custom_activity", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: [], cursor: null }),
      });

      const instance = new CloseCom("test-key");
      await instance.customActivity.type.get();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/custom_activity"),
        expect.objectContaining({ method: "get" })
      );
    });

    it("customActivity.type.create calls POST /custom_activity", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "actitype_1", name: "Cal.com Activity" }),
      });

      const instance = new CloseCom("test-key");
      await instance.customActivity.type.create({
        name: "Cal.com Activity",
        description: "Bookings",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/custom_activity"),
        expect.objectContaining({ method: "post" })
      );
    });
  });

  describe("activity.custom methods", () => {
    it("activity.custom.create calls POST /activity/custom/", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "activity_1" }),
      });

      const instance = new CloseCom("test-key");
      await instance.activity.custom.create({
        custom_activity_type_id: "actitype_1",
        lead_id: "lead_1",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/activity/custom/"),
        expect.objectContaining({ method: "post" })
      );
    });

    it("activity.custom.delete calls DELETE /activity/custom/:uuid/", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const instance = new CloseCom("test-key");
      await instance.activity.custom.delete("uuid_123");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/activity/custom/uuid_123/"),
        expect.objectContaining({ method: "delete" })
      );
    });
  });
});
