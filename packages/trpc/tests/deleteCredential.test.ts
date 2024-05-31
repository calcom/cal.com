import { describe, test } from "vitest";

import { createContextInner } from "../server/createContext";
import { createCaller } from "../server/routers/_app";

describe("deleteCredential", () => {
  test("deleteCredential", async () => {
    const ctx = await createContextInner({ locale: "en" });

    const caller = createCaller(ctx);

    await caller.viewer.deleteCredential({ id: 123 });
    expect(true).toBe(true);
  });
});
