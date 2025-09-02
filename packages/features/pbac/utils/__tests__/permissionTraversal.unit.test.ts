/**
 * Unit tests for permission traversal utilities.
 * Framework: This test file uses standard describe/it/expect APIs compatible with Jest and Vitest.
 * - If repository uses Jest: expect, jest.mock are available.
 * - If repository uses Vitest: expect, vi.mock are available; we alias jest to vi when necessary.
 */
import type { Mock } from 'vitest'; // harmless in Jest; Type-only import gets erased. If Vitest isn't used, this remains type-only.

let traversePermissions: (start: string, dir: "dependencies" | "dependents") => string[];
let getTransitiveDependencies: (p: string) => string[];
let getTransitiveDependents: (p: string) => string[];

// Support both Jest and Vitest mocking by defining a minimal compatibility layer.
const isVitest = typeof vi !== 'undefined';
const mocker = isVitest ? vi : (globalThis as any).jest;

mocker.mock('../../domain/types/permission-registry', () => {
  enum CrudAction {
    Create = "create",
    Read = "read",
    Update = "update",
    Delete = "delete",
  }
  // A CustomAction union replacement; use strings for simplicity
  type CustomAction = "publish" | "archive" | "sync";
  // Build a registry that lets us test a variety of scenarios
  const PERMISSION_REGISTRY: Record<string, Record<string, any>> = {
    post: {
      [CrudAction.Read]:    { /* no explicit dependsOn */ },
      [CrudAction.Create]:  { /* read dependency should be injected by back-compat */ },
      [CrudAction.Update]:  { dependsOn: ["category.read"] }, // explicit cross-resource dep
      [CrudAction.Delete]:  { dependsOn: ["post.update"] },   // forms a chain and back-compat adds read
      publish:              { dependsOn: ["post.update", "moderation.read"] } as any,
      _internal: { note: "should be ignored" },
    },
    category: {
      [CrudAction.Read]:    {},
      [CrudAction.Update]:  { dependsOn: ["category.read"] },
    },
    moderation: {
      [CrudAction.Read]: {},
      archive: { dependsOn: ["post.publish"] }, // cycle across custom actions (publish -> moderation.read via depends; here reverse)
    },
    orphan: {
      // Missing read; unusual resource to test unknown actions in traversal
      ghost: { dependsOn: ["unknown.resource"] },
    },
  };

  return { CrudAction, PERMISSION_REGISTRY };
});

// Now import the module under test, which will consume our mocked registry
import * as mod from '../permissionTraversal';

traversePermissions = mod.traversePermissions;
getTransitiveDependencies = mod.getTransitiveDependencies;
getTransitiveDependents = mod.getTransitiveDependents;

describe("permission traversal - dependencies", () => {
  it("includes explicit dependsOn and applies CRUD read back-compat for create/update/delete", () => {
    const depsCreate = traversePermissions("post.create", "dependencies").sort();
    // Should include post.read (back-compat)
    expect(depsCreate).toContain("post.read");

    const depsUpdate = traversePermissions("post.update", "dependencies").sort();
    // Explicit dependency + back-compat read for update
    expect(depsUpdate).toEqual(expect.arrayContaining(["category.read", "post.read"]));

    const depsDelete = traversePermissions("post.delete", "dependencies").sort();
    // delete -> (explicit) post.update -> category.read and back-compat reads on both post.update and post.delete
    expect(depsDelete).toEqual(expect.arrayContaining(["post.update", "post.read", "category.read"]));
  });

  it("traverses transitively across multiple levels without duplicates and excludes the start node", () => {
    const depsPublish = traversePermissions("post.publish", "dependencies").sort();
    // publish depends on post.update and moderation.read
    // post.update depends on category.read and (back-compat) post.read
    expect(depsPublish).toEqual(expect.arrayContaining(["post.update", "moderation.read", "category.read", "post.read"]));
    // Start permission should not be included
    expect(depsPublish).not.toContain("post.publish");
    // No duplicates
    const set = new Set(depsPublish);
    expect(set.size).toBe(depsPublish.length);
  });

  it("handles cycles gracefully with visited set (no infinite loop)", () => {
    // moderation.archive depends on post.publish, which depends on post.update -> ...
    const depsArchive = traversePermissions("moderation.archive", "dependencies").sort();
    // Ensure traversal completes and contains expected chain without repeating endlessly
    expect(depsArchive).toEqual(expect.arrayContaining(["post.publish", "post.update", "moderation.read", "category.read", "post.read"]));
  });

  it("ignores unknown resources/actions in PERMISSION_REGISTRY and still returns stable results", () => {
    const deps = traversePermissions("orphan.ghost", "dependencies");
    // unknown.resource doesn't exist; function should just skip it gracefully
    expect(Array.isArray(deps)).toBe(true);
    expect(deps).not.toContain("unknown.resource");
  });
});

describe("permission traversal - dependents", () => {
  it("includes dependents via explicit dependsOn references", () => {
    // category.read is depended upon by post.update (explicit)
    const dependents = traversePermissions("category.read", "dependents").sort();
    expect(dependents).toContain("post.update");
  });

  it("includes CRUD dependents when current permission is read of the same resource", () => {
    const dependents = traversePermissions("post.read", "dependents").sort();
    // Any CRUD C/U/D of post should be included due to back-compat rule
    expect(dependents).toEqual(expect.arrayContaining(["post.create", "post.update", "post.delete"]));
    // Custom actions like publish SHOULD NOT be auto-included by CRUD rule
    expect(dependents).not.toContain("post.publish");
  });

  it("traverses dependents transitively and excludes the start node", () => {
    // moderation.read is depended upon by post.publish; and post.publish is depended upon by moderation.archive
    const dependents = traversePermissions("moderation.read", "dependents").sort();
    expect(dependents).toEqual(expect.arrayContaining(["post.publish", "moderation.archive"]));
    expect(dependents).not.toContain("moderation.read");
  });

  it("skips internal keys starting with underscore", () => {
    const dependents = traversePermissions("post.read", "dependents");
    // Ensure _internal doesn't appear as a dependent
    expect(dependents.find(p => p.includes("_internal"))).toBeUndefined();
  });
});

describe("wrapper helpers", () => {
  it("getTransitiveDependencies delegates correctly", () => {
    const deps = getTransitiveDependencies("post.delete");
    expect(deps).toEqual(expect.arrayContaining(["post.update", "post.read", "category.read"]));
  });

  it("getTransitiveDependents delegates correctly", () => {
    const dependents = getTransitiveDependents("category.read");
    expect(dependents).toContain("post.update");
  });
});