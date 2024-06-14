import { describe, expect, it } from "vitest";

import { IdentityProvider } from "@calcom/prisma/enums";

import { buildMockData } from "../../../lib/tests";
import unlinkConnectedAccountHandler from "./unlinkConnectedAccount.handler";

describe("unlinkConnectedAccount.handler", () => {
  it("Should response with a success message when unlinking an Google account", async () => {
    const user = await buildMockData(IdentityProvider.GOOGLE, "123456789012345678901");
    const response = await unlinkConnectedAccountHandler({ ctx: { user } });
    expect(response).toMatchInlineSnapshot(`
      {
        "message": "account_unlinked_success",
      }
    `);
  });
  it("Should respond with an error message if unlink was unsucessful", async () => {
    const user = await buildMockData(IdentityProvider.CAL);
    const response = await unlinkConnectedAccountHandler({ ctx: { user } });
    expect(response).toMatchInlineSnapshot(`
      {
        "message": "account_unlinked_error",
      }
    `);
  });
});
