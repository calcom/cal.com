import type { NextApiRequest, NextApiResponse } from "next";
import { describe, it, expect, vi } from "vitest";

import { defaultResponder } from "./defaultResponder";

describe("defaultResponder", () => {
  it("should call res.json when response is still writable and result is not null", async () => {
    const f = vi.fn().mockResolvedValue({});
    const req = {} as NextApiRequest;
    const res = { json: vi.fn(), writableEnded: false } as unknown as NextApiResponse;
    await defaultResponder(f)(req, res);
    expect(res.json).toHaveBeenCalled();
  });

  it("should not call res.json when response is not writable", async () => {
    const f = vi.fn().mockResolvedValue({});
    const req = {} as NextApiRequest;
    const res = { json: vi.fn(), writableEnded: true } as unknown as NextApiResponse;
    await defaultResponder(f)(req, res);
    expect(res.json).not.toHaveBeenCalled();
  });
});
