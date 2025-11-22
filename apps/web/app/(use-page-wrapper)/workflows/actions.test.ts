import { describe, it, expect, vi } from "vitest";

// Mock the cache module
const mockRevalidateWorkflowsList = vi.fn();

vi.mock("@lib/cache/workflows", () => ({
  revalidateWorkflowsList: mockRevalidateWorkflowsList,
}));

describe("workflows actions", () => {
  it("should call revalidateWorkflowsList when revalidateWorkflowsListAction is invoked", async () => {
    const { revalidateWorkflowsListAction } = await import("./actions");

    await revalidateWorkflowsListAction();

    expect(mockRevalidateWorkflowsList).toHaveBeenCalledOnce();
  });
});
