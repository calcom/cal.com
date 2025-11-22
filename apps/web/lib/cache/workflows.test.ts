import { describe, it, expect, vi, beforeEach } from "vitest";



import { WorkflowRepository } from "@calcom/features/ee/workflows/repositories/WorkflowRepository";
import { filterQuerySchemaStrict } from "@calcom/features/filters/lib/getTeamsFiltersFromQuery";


// Mock Next.js cache functions
let capturedCacheKey: readonly string[] | null = null;
let capturedCacheOptions: { revalidate: number; tags: string[] } | null = null;
let capturedRevalidateTag: string | null = null;

vi.mock("next/cache", () => ({
  unstable_cache: (
    fn: () => Promise<unknown>,
    key: readonly string[],
    options: { revalidate: number; tags: string[] }
  ) => {
    capturedCacheKey = key;
    capturedCacheOptions = options;
    return fn; // Return the function itself so it can be called
  },
  revalidateTag: (tag: string) => {
    capturedRevalidateTag = tag;
  },
}));

// Mock WorkflowRepository
vi.mock("@calcom/features/ee/workflows/repositories/WorkflowRepository", () => ({
  WorkflowRepository: {
    getFilteredList: vi.fn(),
  },
}));

describe("workflows cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedCacheKey = null;
    capturedCacheOptions = null;
    capturedRevalidateTag = null;
  });

  describe("getCachedWorkflowsFilteredList", () => {
    it("should create cache key with userId and filters", async () => {
      const { getCachedWorkflowsFilteredList, CACHE_TAGS } = await import("@lib/cache/workflows");
      const mockWorkflowRepository = vi.mocked(WorkflowRepository);

      const mockResult = {
        filtered: [],
        totalCount: 0,
      };
      mockWorkflowRepository.getFilteredList.mockResolvedValue(mockResult);

      const userId = 123;
      const filters = filterQuerySchemaStrict.parse({
        teamIds: [1, 2],
        userIds: [123],
      });

      const result = await getCachedWorkflowsFilteredList(userId, filters);

      // Assert cache key includes userId and stringified filters
      expect(capturedCacheKey).toEqual(["getCachedWorkflowsFilteredList", "123", JSON.stringify(filters)]);

      // Assert cache options include correct tag and TTL
      expect(capturedCacheOptions).toMatchObject({
        tags: [CACHE_TAGS.WORKFLOWS_LIST],
      });
      expect(capturedCacheOptions?.revalidate).toBeGreaterThan(0);

      // Assert WorkflowRepository was called with correct params
      expect(mockWorkflowRepository.getFilteredList).toHaveBeenCalledWith({
        userId,
        input: { filters },
      });

      // Assert result is returned
      expect(result).toEqual(mockResult);
    });

    it("should create different cache keys for different users", async () => {
      const { getCachedWorkflowsFilteredList } = await import("@lib/cache/workflows");
      const mockWorkflowRepository = vi.mocked(WorkflowRepository);

      mockWorkflowRepository.getFilteredList.mockResolvedValue({
        filtered: [],
        totalCount: 0,
      });

      const filters = filterQuerySchemaStrict.parse({});

      // First user
      await getCachedWorkflowsFilteredList(1, filters);
      const key1 = capturedCacheKey;

      // Second user
      await getCachedWorkflowsFilteredList(2, filters);
      const key2 = capturedCacheKey;

      // Keys should be different
      expect(key1).not.toEqual(key2);
      expect(key1?.[1]).toBe("1");
      expect(key2?.[1]).toBe("2");
    });

    it("should create different cache keys for different filters", async () => {
      const { getCachedWorkflowsFilteredList } = await import("@lib/cache/workflows");
      const mockWorkflowRepository = vi.mocked(WorkflowRepository);

      mockWorkflowRepository.getFilteredList.mockResolvedValue({
        filtered: [],
        totalCount: 0,
      });

      const userId = 123;

      // First filter set
      const filters1 = filterQuerySchemaStrict.parse({ teamIds: [1] });
      await getCachedWorkflowsFilteredList(userId, filters1);
      const key1 = capturedCacheKey;

      // Second filter set
      const filters2 = filterQuerySchemaStrict.parse({ teamIds: [2] });
      await getCachedWorkflowsFilteredList(userId, filters2);
      const key2 = capturedCacheKey;

      // Keys should be different
      expect(key1).not.toEqual(key2);
      expect(key1?.[2]).not.toBe(key2?.[2]);
    });
  });

  describe("revalidateWorkflowsList", () => {
    it("should call revalidateTag with correct tag", async () => {
      const { revalidateWorkflowsList, CACHE_TAGS } = await import("@lib/cache/workflows");

      await revalidateWorkflowsList();

      expect(capturedRevalidateTag).toBe(CACHE_TAGS.WORKFLOWS_LIST);
    });
  });
});