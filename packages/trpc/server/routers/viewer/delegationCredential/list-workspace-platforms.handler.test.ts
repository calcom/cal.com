import { WorkspacePlatformRepository } from "@calcom/features/workspace-platform/repositories/WorkspacePlatformRepository";
import { beforeEach, describe, expect, it, vi } from "vitest";

import handler from "./listWorkspacePlatforms.handler";

vi.mock("@calcom/features/workspace-platform/repositories/WorkspacePlatformRepository", () => ({
  WorkspacePlatformRepository: {
    findAll: vi.fn(),
  },
}));

function buildWorkspacePlatform(overrides?: Record<string, unknown>) {
  return {
    id: 1,
    name: "Google",
    slug: "google",
    enabled: true,
    description: "Google Workspace",
    ...overrides,
  };
}

describe("list workspace platforms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all available workspace platforms", async () => {
    const platforms = [
      buildWorkspacePlatform(),
      buildWorkspacePlatform({ id: 2, name: "Microsoft 365", slug: "office365", description: "Microsoft 365" }),
    ];

    vi.mocked(WorkspacePlatformRepository.findAll).mockResolvedValue(platforms);

    const result = await handler();

    expect(result).toEqual(platforms);
    expect(WorkspacePlatformRepository.findAll).toHaveBeenCalledOnce();
  });

  it("returns an empty list when no platforms are configured", async () => {
    vi.mocked(WorkspacePlatformRepository.findAll).mockResolvedValue([]);

    const result = await handler();

    expect(result).toEqual([]);
  });
});
