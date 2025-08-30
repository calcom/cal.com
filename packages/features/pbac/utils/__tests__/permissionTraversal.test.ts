/* 
  Tests for permission traversal utilities.

  Framework: Uses Vitest if available (vi, describe, it, expect), otherwise Jest globals.
  Conventions: Unit tests focus on BFS traversal, explicit dependsOn, CRUD backward-compat edges, cycles, and invalid input.
*/

import * as traversal from "../permissionTraversal";

// Determine test globals (Vitest vs Jest) in a type-safe-ish way
const isVitest = typeof (globalThis as any).vi !== "undefined";
const testApi = isVitest ? (globalThis as any).vi : (globalThis as any).jest;

// Helper to build a minimal registry object adhering to expected shape
type Registry = Record<string, Record<string, { dependsOn?: string[] } | any>>;

function createRegistry(overrides: Registry): any {
  return overrides;
}

// Mock the PERMISSION_REGISTRY import used inside the module under test.
// We re-require the module after mocking to ensure it picks the mocked value.
// The module under test imports from "../domain/types/permission-registry".
// We will mock that path to return our test-specific registry for each case.

const registryPath = "../domain/types/permission-registry";

// Utility to set mock registry per test
async function withMockedRegistry(registry: Registry, run: () => Promise<void> | void) {
  if (!testApi) {
    // No mocking framework detected; run tests without mocking (may fail in such envs)
    await run();
    return;
  }

  // Reset module registry and mocks between uses
  if (isVitest) {
    (globalThis as any).vi.resetModules?.();
    (globalThis as any).vi.doMock(registryPath, () => {
      // Provide enums CrudAction & CustomAction minimal subset used by the code
      return {
        CrudAction: { Create: "create", Read: "read", Update: "update", Delete: "delete" },
        PERMISSION_REGISTRY: createRegistry(registry),
      };
    });
  } else {
    (globalThis as any).jest.resetModules?.();
    (globalThis as any).jest.doMock(registryPath, () => ({
      CrudAction: { Create: "create", Read: "read", Update: "update", Delete: "delete" },
      PERMISSION_REGISTRY: createRegistry(registry),
    }));
  }

  // Re-import module after setting mock to bind to mocked PERMISSION_REGISTRY
  const mod = await import("../permissionTraversal");
  try {
    await Promise.resolve(run.call(null, mod));
  } finally {
    if (isVitest) {
      (globalThis as any).vi.dontMock?.(registryPath);
      (globalThis as any).vi.resetModules?.();
      (globalThis as any).vi.clearAllMocks?.();
    } else {
      (globalThis as any).jest.dontMock?.(registryPath);
      (globalThis as any).jest.resetModules?.();
      (globalThis as any).jest.clearAllMocks?.();
    }
  }
}

describe("permission traversal - dependencies", () => {
  it("returns explicit dependsOn chain via BFS and deduplicates", async () => {
    const REG: Registry = {
      "org.user": {
        read: {},
        update: { dependsOn: ["org.user.read"] },
        delete: { dependsOn: ["org.user.update", "org.audit.read"] }, // indirect
      },
      "org.audit": {
        read: {},
      },
    };

    await withMockedRegistry(REG, async (mod: typeof traversal) => {
      const depsDelete = mod.getTransitiveDependencies("org.user.delete");
      // Expected order doesn't matter; compare as sets
      expect(new Set(depsDelete)).toEqual(new Set(["org.user.update", "org.user.read", "org.audit.read"]));
    });
  });

  it("adds read as implicit dependency for CRUD create/update/delete even if registry lacks entries", async () => {
    const REG: Registry = {
      foo: {
        read: {}, // present
      },
    };
    await withMockedRegistry(REG, async (mod: typeof traversal) => {
      expect(new Set(mod.getTransitiveDependencies("foo.create"))).toEqual(new Set(["foo.read"]));
      expect(new Set(mod.getTransitiveDependencies("foo.update"))).toEqual(new Set(["foo.read"]));
      expect(new Set(mod.getTransitiveDependencies("foo.delete"))).toEqual(new Set(["foo.read"]));
    });
  });

  it("still falls back to '<resource>.read' for unknown resource CRUD operations", async () => {
    const REG: Registry = {
      known: { read: {} },
    };
    await withMockedRegistry(REG, async (mod: typeof traversal) => {
      const deps = mod.getTransitiveDependencies("unknown.create");
      expect(deps).toContain("unknown.read");
    });
  });

  it("handles cycles without infinite loop and returns unique dependencies", async () => {
    const REG: Registry = {
      alpha: {
        read: { dependsOn: ["beta.read"] },
        update: { dependsOn: ["alpha.read"] },
      },
      beta: {
        read: { dependsOn: ["alpha.read"] }, // cycle alpha.read <-> beta.read
      },
    };
    await withMockedRegistry(REG, async (mod: typeof traversal) => {
      const deps = mod.getTransitiveDependencies("alpha.update");
      expect(new Set(deps)).toEqual(new Set(["alpha.read", "beta.read"]));
    });
  });

  it("throws for invalid permission format (no dot)", async () => {
    const REG: Registry = {
      r: { read: {} },
    };
    await withMockedRegistry(REG, async (mod: typeof traversal) => {
      expect(() => mod.getTransitiveDependencies("invalidPermission")).toThrow(/Invalid permission format/);
    });
  });
});

describe("permission traversal - dependents", () => {
  it("finds dependents based on explicit dependsOn", async () => {
    const REG: Registry = {
      project: {
        read: {},
        update: { dependsOn: ["project.read"] },
        archive: { dependsOn: ["project.read"] },
      },
      audit: {
        read: {},
      },
    };
    await withMockedRegistry(REG, async (mod: typeof traversal) => {
      const dependents = mod.getTransitiveDependents("project.read");
      expect(new Set(dependents)).toEqual(new Set(["project.update", "project.archive"]));
    });
  });

  it("includes CRUD operations as dependents of read for same resource (back-compat)", async () => {
    const REG: Registry = {
      file: {
        read: {},
        create: {},
        update: {},
        delete: {},
      },
    };
    await withMockedRegistry(REG, async (mod: typeof traversal) => {
      const dependents = mod.getTransitiveDependents("file.read");
      expect(new Set(dependents)).toEqual(new Set(["file.create", "file.update", "file.delete"]));
    });
  });

  it("does not include internal keys starting with underscore", async () => {
    const REG: Registry = {
      res: {
        read: {},
        _meta: { note: "skip me" },
        create: { dependsOn: ["res.read"] },
      },
    };
    await withMockedRegistry(REG, async (mod: typeof traversal) => {
      const dependents = mod.getTransitiveDependents("res.read");
      expect(dependents).toContain("res.create");
      expect(dependents.some((p) => p.includes("_meta"))).toBe(false);
    });
  });

  it("handles chained dependents transitively", async () => {
    const REG: Registry = {
      a: {
        read: {},
        update: { dependsOn: ["a.read"] },
        publish: { dependsOn: ["a.update"] }, // depends on dependent
      },
    };
    await withMockedRegistry(REG, async (mod: typeof traversal) => {
      const dependents = mod.getTransitiveDependents("a.read");
      expect(new Set(dependents)).toEqual(new Set(["a.update", "a.publish"]));
    });
  });

  it("throws for invalid current permission format in dependents traversal", async () => {
    const REG: Registry = {
      a: { read: {} },
    };
    await withMockedRegistry(REG, async (mod: typeof traversal) => {
      expect(() => mod.getTransitiveDependents("badformat")).toThrow(/Invalid permission format/);
    });
  });
});

describe("permission traversal - mixed scenarios and robustness", () => {
  it("ignores unrelated resources while computing dependents", async () => {
    const REG: Registry = {
      user: {
        read: {},
        update: { dependsOn: ["user.read"] },
      },
      org: {
        read: {},
        update: { dependsOn: ["org.read"] },
      },
    };
    await withMockedRegistry(REG, async (mod: typeof traversal) => {
      const dependents = mod.getTransitiveDependents("user.read");
      expect(new Set(dependents)).toEqual(new Set(["user.update"]));
      expect(dependents).not.toContain("org.update");
    });
  });

  it("dependency traversal does not include the start permission itself", async () => {
    const REG: Registry = {
      item: {
        read: { dependsOn: ["item.read"] }, // self-dependency pathological
        update: { dependsOn: ["item.read"] },
      },
    };
    await withMockedRegistry(REG, async (mod: typeof traversal) => {
      const deps = mod.getTransitiveDependencies("item.update");
      expect(deps).toContain("item.read");
      expect(deps).not.toContain("item.update"); // start permission excluded
    });
  });
});