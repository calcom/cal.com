import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./deploymentServices/vercel", () => ({
  deleteDomain: vi.fn(),
  createDomain: vi.fn(),
}));

vi.mock("./deploymentServices/cloudflare", () => ({
  deleteDnsRecord: vi.fn(),
  addDnsRecord: vi.fn(),
}));

vi.mock("@calcom/ee/organizations/lib/orgDomains", () => ({
  subdomainSuffix: vi.fn().mockReturnValue("cal.dev"),
}));

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: vi.fn().mockReturnValue({
      error: vi.fn(),
    }),
  },
}));

import { addDnsRecord, deleteDnsRecord } from "./deploymentServices/cloudflare";
import {
  createDomain as createVercelDomain,
  deleteDomain as deleteVercelDomain,
} from "./deploymentServices/vercel";
import { createDomain, deleteDomain, renameDomain } from "./organization";

describe("organization domain management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("VERCEL_URL", "true");
    vi.stubEnv("CLOUDFLARE_DNS", "true");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("deleteDomain", () => {
    it("deletes from Vercel when VERCEL_URL is set", async () => {
      vi.stubEnv("CLOUDFLARE_DNS", "");
      vi.mocked(deleteVercelDomain).mockResolvedValueOnce(true);

      await deleteDomain("test-org");

      expect(deleteVercelDomain).toHaveBeenCalledWith("test-org.cal.dev");
    });

    it("deletes from Cloudflare when CLOUDFLARE_DNS is set", async () => {
      vi.stubEnv("VERCEL_URL", "");
      vi.mocked(deleteDnsRecord).mockResolvedValueOnce(true);

      await deleteDomain("test-org");

      expect(deleteDnsRecord).toHaveBeenCalledWith("test-org.cal.dev");
    });

    it("deletes from both when both env vars set", async () => {
      vi.mocked(deleteVercelDomain).mockResolvedValueOnce(true);
      vi.mocked(deleteDnsRecord).mockResolvedValueOnce(true);

      await deleteDomain("test-org");

      expect(deleteVercelDomain).toHaveBeenCalledWith("test-org.cal.dev");
      expect(deleteDnsRecord).toHaveBeenCalledWith("test-org.cal.dev");
    });

    it("returns true when both deletions succeed", async () => {
      vi.mocked(deleteVercelDomain).mockResolvedValueOnce(true);
      vi.mocked(deleteDnsRecord).mockResolvedValueOnce(true);

      const result = await deleteDomain("test-org");

      expect(result).toBe(true);
    });

    it("returns false when Vercel deletion fails", async () => {
      vi.mocked(deleteVercelDomain).mockResolvedValueOnce(false);
      vi.mocked(deleteDnsRecord).mockResolvedValueOnce(true);

      const result = await deleteDomain("test-org");

      expect(result).toBe(false);
    });
  });

  describe("createDomain", () => {
    it("creates on Vercel when VERCEL_URL is set", async () => {
      vi.stubEnv("CLOUDFLARE_DNS", "");
      vi.mocked(createVercelDomain).mockResolvedValueOnce(true);

      await createDomain("new-org");

      expect(createVercelDomain).toHaveBeenCalledWith("new-org.cal.dev");
    });

    it("creates on Cloudflare when CLOUDFLARE_DNS is set", async () => {
      vi.stubEnv("VERCEL_URL", "");
      vi.mocked(addDnsRecord).mockResolvedValueOnce(true);

      await createDomain("new-org");

      expect(addDnsRecord).toHaveBeenCalledWith("new-org.cal.dev");
    });

    it("returns true when both creations succeed", async () => {
      vi.mocked(createVercelDomain).mockResolvedValueOnce(true);
      vi.mocked(addDnsRecord).mockResolvedValueOnce(true);

      const result = await createDomain("new-org");

      expect(result).toBe(true);
    });
  });

  describe("renameDomain", () => {
    it("creates new domain then deletes old domain", async () => {
      vi.mocked(createVercelDomain).mockResolvedValue(true);
      vi.mocked(addDnsRecord).mockResolvedValue(true);
      vi.mocked(deleteVercelDomain).mockResolvedValue(true);
      vi.mocked(deleteDnsRecord).mockResolvedValue(true);

      await renameDomain("old-org", "new-org");

      expect(createVercelDomain).toHaveBeenCalledWith("new-org.cal.dev");
      expect(deleteVercelDomain).toHaveBeenCalledWith("old-org.cal.dev");
    });

    it("handles null oldSlug (only creates new)", async () => {
      vi.mocked(createVercelDomain).mockResolvedValue(true);
      vi.mocked(addDnsRecord).mockResolvedValue(true);

      await renameDomain(null, "new-org");

      expect(createVercelDomain).toHaveBeenCalledWith("new-org.cal.dev");
      expect(deleteVercelDomain).not.toHaveBeenCalled();
    });

    it("catches and logs error if old domain deletion fails", async () => {
      vi.mocked(createVercelDomain).mockResolvedValue(true);
      vi.mocked(addDnsRecord).mockResolvedValue(true);
      vi.mocked(deleteVercelDomain).mockRejectedValue(new Error("delete failed"));

      await expect(renameDomain("old-org", "new-org")).resolves.toBeUndefined();
    });
  });
});
