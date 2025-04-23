import type { NextRequest } from "next/server";
import { describe } from "vitest";

import handleSMSResponse from "./handleSMSResponse";

describe("handleSMSResponse", () => {
  it("should handle opt out message", async () => {
    await handleSMSResponse({} as NextRequest);
  });
});
