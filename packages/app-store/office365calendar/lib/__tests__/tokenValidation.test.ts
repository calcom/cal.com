import { describe, expect, it } from "vitest";
import { isTokenObjectUnusable } from "../isTokenObjectUnusable";

function buildResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("isTokenObjectUnusable", () => {
  it("returns reason for invalid_grant error", async () => {
    const response = buildResponse(400, {
      error: "invalid_grant",
      error_description:
        "AADSTS70000: The provided value for the input parameter 'refresh_token' is not valid.",
    });

    expect(await isTokenObjectUnusable(response)).toEqual({ reason: "invalid_grant" });
  });

  it("returns null for OK response", async () => {
    const response = buildResponse(200, {
      access_token: "new_token",
      expires_in: 3600,
    });

    expect(await isTokenObjectUnusable(response)).toBeNull();
  });

  it("returns null for non-invalid_grant errors", async () => {
    const response = buildResponse(400, {
      error: "invalid_request",
      error_description: "Some other error",
    });

    expect(await isTokenObjectUnusable(response)).toBeNull();
  });

  it("returns null for unparseable JSON body", async () => {
    const response = new Response("not json", { status: 500 });

    expect(await isTokenObjectUnusable(response)).toBeNull();
  });
});
