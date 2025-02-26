import type { DirectorySyncEvent } from "@boxyhq/saml-jackson";
import { describe, expect, it } from "vitest";

import getAttributesFromScimPayload from "../getAttributesFromScimPayload";

const directoryId = "xxx-xxx-xxx-xxx";
describe("getAttributesFromScimPayload", () => {
  it("should return empty object for unsupported events", () => {
    const event = {
      event: "user.deleted",
      data: { raw: { schemas: [] } },
    } as DirectorySyncEvent;

    const result = getAttributesFromScimPayload({ event, directoryId });
    expect(result).toEqual({});
  });

  it("should extract string attributes from custom schemas", () => {
    const event = {
      event: "user.created",
      data: {
        raw: {
          schemas: ["urn:ietf:params:scim:schemas:core:2.0:User", "custom:enterprise"],
          "custom:enterprise": {
            department: "Engineering",
            title: "Software Engineer",
          },
        },
      },
    } as DirectorySyncEvent;

    const result = getAttributesFromScimPayload({ event, directoryId });
    expect(result).toEqual({
      department: "Engineering",
      title: "Software Engineer",
    });
  });

  it("should extract string array attributes", () => {
    const event = {
      event: "user.updated",
      data: {
        raw: {
          schemas: ["custom:enterprise"],
          "custom:enterprise": {
            skills: ["JavaScript", "TypeScript", "React"],
          },
        },
      },
    } as DirectorySyncEvent;

    const result = getAttributesFromScimPayload({ event, directoryId });
    expect(result).toEqual({
      skills: ["JavaScript", "TypeScript", "React"],
    });
  });

  it("should ignore null values", () => {
    const event = {
      event: "user.created",
      data: {
        raw: {
          schemas: ["custom:enterprise"],
          "custom:enterprise": {
            department: "Engineering",
            title: null,
          },
        },
      },
    } as DirectorySyncEvent;

    const result = getAttributesFromScimPayload({ event, directoryId });
    expect(result).toEqual({
      department: "Engineering",
    });
  });

  it("should ignore an object value as well", () => {
    const event = {
      event: "user.created",
      data: {
        raw: {
          schemas: ["custom:enterprise"],
          "custom:enterprise": {
            department: { value: "Engineering" },
          },
        },
      },
    } as DirectorySyncEvent;

    const result = getAttributesFromScimPayload({ event, directoryId });
    expect(result).toEqual({});
  });

  it("should handle multiple schemas but ignore duplicates - You can only have department in one namespace right now", () => {
    const event = {
      event: "user.created",
      data: {
        raw: {
          schemas: ["custom:enterprise", "custom:org"],
          "custom:enterprise": {
            department: "Engineering",
          },
          "custom:org": {
            department: "Different Department", // This should be ignored as department already exists
            location: "Remote",
          },
        },
      },
    } as DirectorySyncEvent;

    const result = getAttributesFromScimPayload({ event, directoryId });
    expect(result).toEqual({
      department: "Engineering",
      location: "Remote",
    });
  });

  it("should ignore non-string schema names", () => {
    const event = {
      event: "user.created",
      data: {
        raw: {
          schemas: ["custom:enterprise", 123], // Invalid schema
          "custom:enterprise": {
            department: "Engineering",
          },
        },
      },
    } as DirectorySyncEvent;

    const result = getAttributesFromScimPayload({ event, directoryId });
    expect(result).toEqual({
      department: "Engineering",
    });
  });

  it("should extract from core namespace as well ignoring the core attributes as defined in the SCIM spec.", () => {
    const event = {
      event: "user.created",
      data: {
        raw: {
          schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
          userName: "kush@acme.com",
          name: { givenName: "Kush", familyName: "Kush" },
          emails: [{ primary: true, value: "kush@acme.com" }],
          displayName: "Kush",
          territory: "XANAM",
          externalId: "00ulb1kpy4EMATtuS5d7",
          groups: [],
          active: true,
        },
      },
    } as DirectorySyncEvent;

    const result = getAttributesFromScimPayload({ event, directoryId });
    expect(result).toEqual({
      territory: "XANAM",
      // Core Attributes won't be there - It avoids unnecessary warnings about attributes not defined in cal.com
      // userName: "kush@acme.com",
      // displayName: "Kush",
      // externalId: "00ulb1kpy4EMATtuS5d7",
      // groups: [],
    });
  });
});
