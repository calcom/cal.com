import { describe, expect, it, vi } from "vitest";

// Mock jackson to avoid connecting to SAML database which hangs in CI
vi.mock("@calcom/features/ee/sso/lib/jackson", () => ({
  default: vi.fn(() =>
    Promise.resolve({
      connectionController: {
        getConnections: vi.fn(() => Promise.resolve([])),
      },
    })
  ),
}));

import { handler } from "./ssoConnections.handler";

describe("publicViewer.ssoConnections - integration", () => {
  it("should return connectionExists property", async () => {
    const result = await handler();

    expect(result).toHaveProperty("connectionExists");
    // In hosted mode or when SAML is disabled, connectionExists will be null
    // In self-hosted with SAML enabled, it will be a boolean
    expect(result.connectionExists === null || typeof result.connectionExists === "boolean").toBe(true);
  });
});
