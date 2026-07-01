import { describe, it, expect } from "vitest";
import { APP_CATEGORY_ENTRIES, CATEGORY_ORDER } from "./getAppCategories";

import type { ActiveAppCategoryKeys } from "./getAppCategories"

describe("getAppCategories", () => {
    it("should have CATEGORY_ORDER that includes all ActiveAppCategoryKeys", () => {
        const categoryEntriesKeys = Object.keys(APP_CATEGORY_ENTRIES) as ActiveAppCategoryKeys[]
        const categoryOrderKeys = CATEGORY_ORDER

        const missingInOrder = categoryEntriesKeys.filter((key) => !categoryOrderKeys.includes(key))
        const missingInEntries = categoryOrderKeys.filter((key) => !categoryEntriesKeys.includes(key))

        expect(categoryOrderKeys).toHaveLength(categoryEntriesKeys.length)
        expect(missingInEntries).toHaveLength(0)
        expect(missingInOrder).toHaveLength(0)
    })
})