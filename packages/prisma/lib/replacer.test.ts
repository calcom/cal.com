// Import necessary functions from Vitest
import { describe, it, expect } from "vitest";

// Import the function to test (adjust path if necessary)
import { createReplacer } from "./replacer";

// --- Test Data ---

// Define a type for the example object
interface UserData {
  id: number;
  username: string;
  email: string;
  profile: {
    firstName: string;
    lastName: string;
    internalId: string; // Sensitive
  };
  apiKey: string | null; // Sensitive
  roles: string[];
  metadata: any;
  passwordHash: string; // Sensitive
  nestedArray: Array<{ secretCode: string; publicInfo: string }>; // Sensitive inside array
}

// Example large object for testing
const testObject: UserData = {
  id: 123,
  username: "testuser",
  email: "test@example.com",
  profile: {
    firstName: "Test",
    lastName: "User",
    internalId: "abc-internal-xyz", // Sensitive data
  },
  apiKey: "supersecretapikey12345", // Sensitive data
  roles: ["admin", "editor"],
  metadata: { lastLogin: new Date(2024, 0, 1), loginCount: 5 }, // Use fixed date for consistent JSON
  passwordHash: "$2b$10$abcdefghijklmnopqrstuv", // Sensitive data
  nestedArray: [
    { secretCode: "alpha", publicInfo: "info1" }, // Sensitive property in object within array
    { secretCode: "beta", publicInfo: "info2" },
  ],
};

// Define the sensitive keys to be redacted
const sensitiveKeys: string[] = ["passwordHash", "apiKey", "internalId", "secretCode"];

// Create a Set for efficient lookups
const keysToRedactSet = new Set<string>(sensitiveKeys);

// --- Test Suite ---

describe("createReplacer for JSON.stringify redaction", () => {
  it("should return a function", () => {
    const replacer = createReplacer(keysToRedactSet);
    expect(replacer).toBeInstanceOf(Function);
  });

  it("should redact specified top-level keys when used with JSON.stringify", () => {
    const replacer = createReplacer(keysToRedactSet);
    const jsonString = JSON.stringify(testObject, replacer);
    const resultObject = JSON.parse(jsonString); // Parse back to check keys

    expect(resultObject).not.toHaveProperty("passwordHash");
    expect(resultObject).not.toHaveProperty("apiKey");
    expect(resultObject).toHaveProperty("id", 123); // Ensure non-sensitive keys remain
    expect(resultObject).toHaveProperty("username", "testuser");
  });

  it("should redact specified nested keys when used with JSON.stringify", () => {
    const replacer = createReplacer(keysToRedactSet);
    const jsonString = JSON.stringify(testObject, replacer);
    const resultObject = JSON.parse(jsonString);

    expect(resultObject.profile).toBeDefined();
    expect(resultObject.profile).not.toHaveProperty("internalId");
    expect(resultObject.profile).toHaveProperty("firstName", "Test"); // Ensure other nested keys remain
  });

  it("should redact specified keys within objects in arrays", () => {
    const replacer = createReplacer(keysToRedactSet);
    const jsonString = JSON.stringify(testObject, replacer);
    const resultObject = JSON.parse(jsonString);

    expect(resultObject.nestedArray).toBeDefined();
    expect(resultObject.nestedArray).toHaveLength(2);
    expect(resultObject.nestedArray[0]).not.toHaveProperty("secretCode");
    expect(resultObject.nestedArray[0]).toHaveProperty("publicInfo", "info1");
    expect(resultObject.nestedArray[1]).not.toHaveProperty("secretCode");
    expect(resultObject.nestedArray[1]).toHaveProperty("publicInfo", "info2");
  });

  it("should not modify the original object", () => {
    const originalObjectJson = JSON.stringify(testObject); // Store original state as JSON
    const replacer = createReplacer(keysToRedactSet);

    // Perform the stringify operation
    JSON.stringify(testObject, replacer);

    // Verify the original object hasn't changed by comparing its JSON representation
    expect(JSON.stringify(testObject)).toEqual(originalObjectJson);

    // Also check a sensitive key directly on the original object
    expect(testObject).toHaveProperty("passwordHash");
    expect(testObject.profile).toHaveProperty("internalId");
  });

  it("should handle an empty set of keys to redact (no redaction)", () => {
    const emptySet = new Set<string>();
    const replacer = createReplacer(emptySet);
    const jsonString = JSON.stringify(testObject, replacer);
    const resultObject = JSON.parse(jsonString);

    // Compare the result with the original object (after stringify/parse)
    // Need to stringify the original again for fair comparison due to potential Date object changes
    const originalParsed = JSON.parse(JSON.stringify(testObject));
    expect(resultObject).toEqual(originalParsed);
  });

  it("should handle objects with no sensitive keys", () => {
    const simpleObject = { id: 1, name: "Simple" };
    const replacer = createReplacer(keysToRedactSet); // Use the original set
    const jsonString = JSON.stringify(simpleObject, replacer);
    const resultObject = JSON.parse(jsonString);

    expect(resultObject).toEqual(simpleObject);
  });
});
