/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, vi, afterEach, test } from "vitest";

import CloseCom from "@calcom/lib/CloseCom";
import {
  getCloseComContactIds,
  getCustomActivityTypeInstanceData,
  getCloseComCustomActivityTypeFieldsIds,
  getCloseComLeadId,
} from "@calcom/lib/CloseComeUtils";
import type { CalendarEvent } from "@calcom/types/Calendar";

vi.mock("@calcom/lib/CloseCom", () => ({
  default: class {
    constructor() {
      /* Mock */
    }
  },
}));

afterEach(() => {
  vi.resetAllMocks();
});

// getCloseComLeadId
test("check generic lead generator: already exists", async () => {
  CloseCom.prototype.lead = {
    list: () => ({
      data: [{ name: "From Cal.com", id: "abc" }],
    }),
  } as any;

  const closeCom = new CloseCom("someKey");
  const id = await getCloseComLeadId(closeCom);
  expect(id).toEqual("abc");
});

// getCloseComLeadId
test("check generic lead generator: doesn't exist", async () => {
  CloseCom.prototype.lead = {
    list: () => ({
      data: [],
    }),
    create: () => ({ id: "def" }),
  } as any;

  const closeCom = new CloseCom("someKey");
  const id = await getCloseComLeadId(closeCom);
  expect(id).toEqual("def");
});

// getCloseComContactIds
test("retrieve contact IDs: all exist", async () => {
  const attendees = [
    { email: "test1@example.com", id: "test1" },
    { email: "test2@example.com", id: "test2" },
  ];

  const event = {
    attendees,
  } as { attendees: { email: string; name: string | null; id: string }[] };

  CloseCom.prototype.contact = {
    search: () => ({ data: attendees }),
  } as any;

  const closeCom = new CloseCom("someKey");
  const contactIds = await getCloseComContactIds(event.attendees, closeCom, "leadId");
  expect(contactIds).toEqual(["test1", "test2"]);
});

// getCloseComContactIds
test("retrieve contact IDs: some don't exist", async () => {
  const attendees = [{ email: "test1@example.com", id: "test1" }, { email: "test2@example.com" }];

  const event = {
    attendees,
  } as CalendarEvent;

  CloseCom.prototype.contact = {
    search: () => ({ data: [{ emails: [{ email: "test1@example.com" }], id: "test1" }] }),
    create: () => ({ id: "test3" }),
  } as any;

  const closeCom = new CloseCom("someKey");
  const contactIds = await getCloseComContactIds(event.attendees, closeCom, "leadId");
  expect(contactIds).toEqual(["test1", "test3"]);
});

// getCloseComCustomActivityTypeFieldsIds
test("retrieve custom fields for custom activity type: type doesn't exist, no field created", async () => {
  CloseCom.prototype.activity = {
    type: {
      get: () => [],
    },
  } as any;

  CloseCom.prototype.customActivity = {
    type: {
      get: () => ({ data: [] }),
      create: () => ({ id: "type1" }),
    },
  } as any;

  CloseCom.prototype.customField = {
    activity: {
      create: (data: { name: string }) => ({ id: `field${data.name.length}${data.name[0]}` }),
    },
  } as any;

  const closeCom = new CloseCom("someKey");
  const contactIds = await getCloseComCustomActivityTypeFieldsIds(
    [
      ["Attendees", "", true, true],
      ["Date & Time", "", true, true],
      ["Time Zone", "", true, true],
    ],
    closeCom
  );
  expect(contactIds).toEqual({
    activityType: "type1",
    fields: ["field9A", "field11D", "field9T"],
  });
});

// getCloseComCustomActivityTypeFieldsIds
test("retrieve custom fields for custom activity type: type exists, no field created", async () => {
  CloseCom.prototype.activity = {
    type: {
      get: () => [],
    },
  } as any;

  CloseCom.prototype.customActivity = {
    type: {
      get: () => ({ data: [{ id: "typeX", name: "Cal.com Activity" }] }),
    },
  } as any;

  CloseCom.prototype.customField = {
    activity: {
      get: () => ({ data: [{ id: "fieldY", custom_activity_type_id: "typeX", name: "Attendees" }] }),
      create: (data: { name: string }) => ({ id: `field${data.name.length}${data.name[0]}` }),
    },
  } as any;

  const closeCom = new CloseCom("someKey");
  const contactIds = await getCloseComCustomActivityTypeFieldsIds(
    [
      ["Attendees", "", true, true],
      ["Date & Time", "", true, true],
      ["Time Zone", "", true, true],
    ],
    closeCom
  );
  expect(contactIds).toEqual({
    activityType: "typeX",
    fields: ["fieldY", "field11D", "field9T"],
  });
});

// getCustomActivityTypeInstanceData
test("prepare data to create custom activity type instance: two attendees, no additional notes", async () => {
  const attendees = [
    { email: "test1@example.com", id: "test1", timeZone: "America/Montevideo" },
    { email: "test2@example.com" },
  ];

  const now = new Date();

  const event = {
    attendees,
    startTime: now.toISOString(),
  } as unknown as CalendarEvent;

  CloseCom.prototype.activity = {
    type: {
      get: () => [],
    },
  } as any;

  CloseCom.prototype.customActivity = {
    type: {
      get: () => ({ data: [] }),
      create: () => ({ id: "type1" }),
    },
  } as any;

  CloseCom.prototype.customField = {
    activity: {
      create: (data: { name: string }) => ({ id: `field${data.name.length}${data.name[0]}` }),
    },
  } as any;

  CloseCom.prototype.lead = {
    list: () => ({
      data: [],
    }),
    create: () => ({ id: "def" }),
  } as any;

  const closeCom = new CloseCom("someKey");
  const data = await getCustomActivityTypeInstanceData(
    event,
    [
      ["Attendees", "", true, true],
      ["Date & Time", "", true, true],
      ["Time Zone", "", true, true],
    ],
    closeCom
  );
  expect(data).toEqual({
    custom_activity_type_id: "type1",
    lead_id: "def",
    "custom.field9A": ["test3"],
    "custom.field11D": now.toISOString(),
    "custom.field9T": "America/Montevideo",
  });
});

// getCustomActivityTypeInstanceData
test("prepare data to create custom activity type instance: one attendees, with additional notes", async () => {
  const attendees = [{ email: "test1@example.com", id: "test1", timeZone: "America/Montevideo" }];

  const now = new Date();

  const event = {
    attendees,
    startTime: now.toISOString(),
    additionalNotes: "Some comment!",
  } as any;

  CloseCom.prototype.activity = {
    type: {
      get: () => [],
    },
  } as any;

  CloseCom.prototype.customActivity = {
    type: {
      get: () => ({ data: [] }),
      create: () => ({ id: "type1" }),
    },
  } as any;

  CloseCom.prototype.customField = {
    activity: {
      create: (data: { name: string }) => ({ id: `field${data.name.length}${data.name[0]}` }),
    },
  } as any;

  CloseCom.prototype.lead = {
    list: () => ({
      data: [{ name: "From Cal.com", id: "abc" }],
    }),
  } as any;

  const closeCom = new CloseCom("someKey");
  const data = await getCustomActivityTypeInstanceData(
    event,
    [
      ["Attendees", "", true, true],
      ["Date & Time", "", true, true],
      ["Time Zone", "", true, true],
    ],
    closeCom
  );
  expect(data).toEqual({
    custom_activity_type_id: "type1",
    lead_id: "abc",
    "custom.field9A": null,
    "custom.field11D": now.toISOString(),
    "custom.field9T": "America/Montevideo",
  });
});
