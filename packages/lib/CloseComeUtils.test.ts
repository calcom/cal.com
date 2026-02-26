import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  getCloseComContactIds,
  getCloseComCustomActivityTypeFieldsIds,
  getCloseComLeadId,
  getCustomFieldsIds,
} from "./CloseComeUtils";

function createMockCloseCom() {
  return {
    contact: {
      search: vi.fn(),
      create: vi.fn(),
    },
    lead: {
      list: vi.fn(),
      create: vi.fn(),
    },
    customActivity: {
      type: {
        get: vi.fn(),
        create: vi.fn(),
      },
    },
    customField: {
      activity: {
        get: vi.fn(),
        create: vi.fn(),
      },
      contact: {
        get: vi.fn(),
        create: vi.fn(),
      },
      shared: {
        get: vi.fn(),
        create: vi.fn(),
      },
    },
  };
}

type MockCloseCom = ReturnType<typeof createMockCloseCom>;

describe("getCloseComContactIds", () => {
  let closeCom: MockCloseCom;

  beforeEach(() => {
    closeCom = createMockCloseCom();
  });

  it("returns existing contact ids when all contacts found", async () => {
    closeCom.contact.search.mockResolvedValue({
      data: [
        { id: "cont_1", emails: [{ email: "a@test.com" }] },
        { id: "cont_2", emails: [{ email: "b@test.com" }] },
      ],
    });

    const result = await getCloseComContactIds(
      [
        { email: "a@test.com", name: "A" },
        { email: "b@test.com", name: "B" },
      ],
      closeCom as never
    );

    expect(result).toEqual(["cont_1", "cont_2"]);
  });

  it("creates missing contacts when leadFromCalComId provided", async () => {
    closeCom.contact.search.mockResolvedValue({
      data: [{ id: "cont_1", emails: [{ email: "a@test.com" }] }],
    });
    closeCom.contact.create.mockResolvedValue({ id: "cont_new" });

    const result = await getCloseComContactIds(
      [
        { email: "a@test.com", name: "A" },
        { email: "b@test.com", name: "B" },
      ],
      closeCom as never,
      "lead_123"
    );

    expect(closeCom.contact.create).toHaveBeenCalledWith({
      person: { email: "b@test.com", name: "B" },
      leadId: "lead_123",
    });
    expect(result).toEqual(["cont_1", "cont_new"]);
  });

  it("rejects when some contacts fail to create", async () => {
    closeCom.contact.search.mockResolvedValue({
      data: [],
    });
    // No contacts created (empty array)
    closeCom.contact.create.mockRejectedValue(new Error("API error"));

    await expect(
      getCloseComContactIds([{ email: "a@test.com", name: "A" }], closeCom as never, "lead_123")
    ).rejects.toBeDefined();
  });

  it("returns existing contacts without creating when no lead provided", async () => {
    closeCom.contact.search.mockResolvedValue({
      data: [{ id: "cont_1", emails: [{ email: "a@test.com" }] }],
    });

    const result = await getCloseComContactIds(
      [
        { email: "a@test.com", name: "A" },
        { email: "b@test.com", name: "B" },
      ],
      closeCom as never
    );

    expect(closeCom.contact.create).not.toHaveBeenCalled();
    expect(result).toEqual(["cont_1"]);
  });
});

describe("getCloseComLeadId", () => {
  let closeCom: MockCloseCom;

  beforeEach(() => {
    closeCom = createMockCloseCom();
  });

  it("returns existing lead id when found", async () => {
    closeCom.lead.list.mockResolvedValue({
      data: [{ name: "From Cal.com", id: "lead_existing" }],
    });

    const result = await getCloseComLeadId(closeCom as never);
    expect(result).toBe("lead_existing");
    expect(closeCom.lead.create).not.toHaveBeenCalled();
  });

  it("creates a new lead when not found", async () => {
    closeCom.lead.list.mockResolvedValue({ data: [] });
    closeCom.lead.create.mockResolvedValue({ id: "lead_new" });

    const result = await getCloseComLeadId(closeCom as never);
    expect(result).toBe("lead_new");
    expect(closeCom.lead.create).toHaveBeenCalledWith({
      companyName: "From Cal.com",
      description: "Generic Lead for Contacts created by Cal.com",
    });
  });

  it("accepts custom lead info", async () => {
    closeCom.lead.list.mockResolvedValue({ data: [] });
    closeCom.lead.create.mockResolvedValue({ id: "lead_custom" });

    const result = await getCloseComLeadId(closeCom as never, {
      companyName: "Custom Company",
      description: "Custom lead",
    });

    expect(result).toBe("lead_custom");
    expect(closeCom.lead.create).toHaveBeenCalledWith({
      companyName: "Custom Company",
      description: "Custom lead",
    });
  });

  it("returns empty string when created lead has no id", async () => {
    closeCom.lead.list.mockResolvedValue({ data: [] });
    closeCom.lead.create.mockResolvedValue({});

    const result = await getCloseComLeadId(closeCom as never);
    expect(result).toBe("");
  });
});

describe("getCustomFieldsIds", () => {
  let closeCom: MockCloseCom;

  beforeEach(() => {
    closeCom = createMockCloseCom();
  });

  it("returns existing field ids when fields already exist", async () => {
    closeCom.customField.activity.get.mockResolvedValue({
      data: [
        { id: "field_1", name: "Attendee", custom_activity_type_id: "act_1" },
        { id: "field_2", name: "Date", custom_activity_type_id: "act_1" },
      ],
    });

    const customFields: [string, string, boolean, boolean][] = [
      ["Attendee", "text", true, false],
      ["Date", "date", true, false],
    ];

    const result = await getCustomFieldsIds("activity", customFields, closeCom as never, "act_1");
    expect(result).toEqual(["field_1", "field_2"]);
  });

  it("creates missing activity fields", async () => {
    closeCom.customField.activity.get.mockResolvedValue({
      data: [],
    });
    closeCom.customField.activity.create.mockResolvedValue({ id: "new_field" });

    const customFields: [string, string, boolean, boolean][] = [["Notes", "text", false, false]];

    const result = await getCustomFieldsIds("activity", customFields, closeCom as never, "act_1");
    expect(closeCom.customField.activity.create).toHaveBeenCalledWith({
      name: "Notes",
      type: "text",
      required: false,
      accepts_multiple_values: false,
      editable_with_roles: [],
      custom_activity_type_id: "act_1",
    });
    expect(result).toEqual(["new_field"]);
  });

  it("creates missing contact fields", async () => {
    closeCom.customField.contact.get.mockResolvedValue({
      data: [],
    });
    closeCom.customField.contact.create.mockResolvedValue({ id: "contact_field" });

    const customFields: [string, string, boolean, boolean][] = [["Phone", "text", false, false]];

    const result = await getCustomFieldsIds("contact", customFields, closeCom as never);
    expect(closeCom.customField.contact.create).toHaveBeenCalledWith({
      name: "Phone",
      type: "text",
      required: false,
      accepts_multiple_values: false,
      editable_with_roles: [],
    });
    expect(result).toEqual(["contact_field"]);
  });
});

describe("getCloseComCustomActivityTypeFieldsIds", () => {
  let closeCom: MockCloseCom;

  beforeEach(() => {
    closeCom = createMockCloseCom();
  });

  it("returns existing activity type and fields when found", async () => {
    closeCom.customActivity.type.get.mockResolvedValue({
      data: [{ name: "Cal.com Activity", id: "act_existing" }],
    });
    closeCom.customField.activity.get.mockResolvedValue({
      data: [
        { id: "f1", name: "Attendee", custom_activity_type_id: "act_existing" },
        { id: "f2", name: "DateTime", custom_activity_type_id: "act_existing" },
      ],
    });

    const customFields: [string, string, boolean, boolean][] = [
      ["Attendee", "text", true, false],
      ["DateTime", "date", true, false],
    ];

    const result = await getCloseComCustomActivityTypeFieldsIds(customFields, closeCom as never);
    expect(result.activityType).toBe("act_existing");
    expect(result.fields).toEqual(["f1", "f2"]);
  });

  it("creates new activity type and fields when not found", async () => {
    closeCom.customActivity.type.get.mockResolvedValue({ data: [] });
    closeCom.customActivity.type.create.mockResolvedValue({ id: "act_new" });
    closeCom.customField.activity.create
      .mockResolvedValueOnce({ id: "nf1" })
      .mockResolvedValueOnce({ id: "nf2" });

    const customFields: [string, string, boolean, boolean][] = [
      ["Attendee", "text", true, false],
      ["DateTime", "date", true, false],
    ];

    const result = await getCloseComCustomActivityTypeFieldsIds(customFields, closeCom as never);
    expect(result.activityType).toBe("act_new");
    expect(result.fields).toEqual(["nf1", "nf2"]);
    expect(closeCom.customActivity.type.create).toHaveBeenCalledWith({
      name: "Cal.com Activity",
      description: "Bookings in your Cal.com account",
    });
  });
});
