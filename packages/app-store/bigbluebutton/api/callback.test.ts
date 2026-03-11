import handler from "./callback";
import { describe, expect, it, vi } from "vitest";

describe("bigbluebutton callback", () => {
  it("returns an informative success response", async () => {
    const req = {} as never;
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    const res = { status } as never;

    await handler(req, res);

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ ok: true })
    );
  });
});
