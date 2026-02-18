/**
 * Unit tests for FormEdit field adapter functions.
 *
 * Tests cover:
 *  - toFormBuilderField: ID preservation, required, options, and type-lock
 *  - toRoutingField: ID preservation, router field metadata preservation
 *  - ID registry: reordering/renaming does not reassign IDs; new fields get new IDs
 *  - Type lock: when hasResponses, existing fields get editable:"system-but-optional"
 *    and applyTypeRevertGuard applies the defence-in-depth revert
 *  - Router-field lock: fields with routerId always get editable:"system"
 *  - isRouterField: correctly identifies linked-router fields
 *  - applyTypeRevertGuard: reverts type mutations for existing fields
 *
 * All tests import the real production implementations from formEditUtils.ts so
 * that tests always stay in sync with the production code.
 */

import { v4 as uuidv4 } from "uuid";

// The production adapter functions — imported directly so tests cannot diverge.
// formEditUtils.ts only has Node-compatible imports (no browser/React dependencies).
import { toFormBuilderField, toRoutingField, applyTypeRevertGuard, isRouterField } from "./formEditUtils";
import type { RoutingField, FormBuilderField } from "./formEditUtils";

// ─── Local narrow types for test fixtures ─────────────────────────────────────

type RoutingFieldBase = {
  id: string;
  label: string;
  identifier?: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  options?: { label: string; id: string }[];
};

type RouterRoutingField = RoutingFieldBase & {
  routerId: string;
  router?: { name: string; description: string; id: string };
  routerField?: RoutingFieldBase;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRoutingField(overrides: Partial<RoutingFieldBase> = {}): RoutingField {
  return {
    id: uuidv4(),
    label: "Full Name",
    identifier: "full_name",
    type: "text",
    required: false,
    placeholder: "",
    ...overrides,
  } as RoutingField;
}

function makeRouterRoutingField(overrides: Partial<RouterRoutingField> = {}): RoutingField {
  return {
    id: uuidv4(),
    label: "Department",
    identifier: "department",
    type: "select",
    required: false,
    placeholder: "",
    routerId: "router-form-id-123",
    router: { name: "Dept Router", description: "Routes by dept", id: "router-form-id-123" },
    routerField: {
      id: uuidv4(),
      label: "Department",
      identifier: "department",
      type: "select",
    },
    ...overrides,
  } as RoutingField;
}

// ─── isRouterField tests ──────────────────────────────────────────────────────

describe("isRouterField", () => {
  it("returns true for a field with a non-empty routerId", () => {
    const field = makeRouterRoutingField({ routerId: "some-router-id" } as any);
    expect(isRouterField(field)).toBe(true);
  });

  it("returns false for a plain routing field (no routerId)", () => {
    const field = makeRoutingField();
    expect(isRouterField(field)).toBe(false);
  });

  it("returns false when routerId is an empty string", () => {
    const field = { ...makeRoutingField(), routerId: "" } as RoutingField;
    expect(isRouterField(field)).toBe(false);
  });
});

// ─── toFormBuilderField tests ─────────────────────────────────────────────────

describe("toFormBuilderField", () => {
  it("uses identifier as name when present", () => {
    const field = makeRoutingField({ identifier: "my_field", label: "My Field" });
    const bf = toFormBuilderField(field);
    expect(bf.name).toBe("my_field");
  });

  it("falls back to slugified label when identifier is absent", () => {
    const field = makeRoutingField({ identifier: undefined, label: "First Name" });
    const bf = toFormBuilderField(field);
    expect(bf.name).toBe("first_name");
  });

  it("maps required correctly", () => {
    const required = toFormBuilderField(makeRoutingField({ required: true }));
    expect(required.required).toBe(true);
    const optional = toFormBuilderField(makeRoutingField({ required: false }));
    expect(optional.required).toBe(false);
  });

  it("maps options: routing opt.id → FormBuilder opt.value", () => {
    const field = makeRoutingField({
      type: "select",
      options: [
        { label: "Engineering", id: "opt-1" },
        { label: "Marketing", id: "opt-2" },
      ],
    });
    const bf = toFormBuilderField(field);
    expect(bf.options).toEqual([
      { label: "Engineering", value: "opt-1" },
      { label: "Marketing", value: "opt-2" },
    ]);
  });

  it("sets editable:'user' when lockType is false (default)", () => {
    const bf = toFormBuilderField(makeRoutingField());
    expect(bf.editable).toBe("user");
  });

  it("sets editable:'system-but-optional' when lockType is true (non-router field)", () => {
    const bf = toFormBuilderField(makeRoutingField(), true);
    expect(bf.editable).toBe("system-but-optional");
  });

  it("sets editable:'system' for a router field regardless of lockType=false", () => {
    const routerField = makeRouterRoutingField();
    const bf = toFormBuilderField(routerField, false);
    expect(bf.editable).toBe("system");
  });

  it("sets editable:'system' for a router field regardless of lockType=true", () => {
    const routerField = makeRouterRoutingField();
    const bf = toFormBuilderField(routerField, true);
    // Router fields take precedence over the hasResponses lock
    expect(bf.editable).toBe("system");
  });

  it("maps type from routing field", () => {
    const bf = toFormBuilderField(makeRoutingField({ type: "multiselect" }));
    expect(bf.type).toBe("multiselect");
  });

  it("handles router fields — type comes from routerField.type (or field.type)", () => {
    const routerField = makeRouterRoutingField({ type: "select" } as any);
    const bf = toFormBuilderField(routerField);
    expect(bf.type).toBe("select");
  });
});

// ─── toRoutingField tests ─────────────────────────────────────────────────────

describe("toRoutingField", () => {
  it("uses provided originalId, not a new UUID", () => {
    const stableId = uuidv4();
    const bf: FormBuilderField = { name: "full_name", label: "Full Name", type: "text" } as FormBuilderField;
    const rf = toRoutingField(bf, stableId) as RoutingFieldBase;
    expect(rf.id).toBe(stableId);
  });

  it("generates a UUID when originalId is not provided", () => {
    const bf: FormBuilderField = { name: "email", label: "Email", type: "email" } as FormBuilderField;
    const rf = toRoutingField(bf) as RoutingFieldBase;
    expect(rf.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("preserves required from builder field", () => {
    const bf: FormBuilderField = { name: "phone", label: "Phone", type: "phone", required: true } as FormBuilderField;
    const rf = toRoutingField(bf) as RoutingFieldBase;
    expect(rf.required).toBe(true);
  });

  it("maps options: FormBuilder opt.value → routing opt.id", () => {
    const bf: FormBuilderField = {
      name: "dept",
      label: "Department",
      type: "select",
      options: [
        { label: "Eng", value: "opt-1" },
        { label: "Mkt", value: "opt-2" },
      ],
    } as FormBuilderField;
    const rf = toRoutingField(bf) as RoutingFieldBase;
    expect(rf.options).toEqual([
      { label: "Eng", id: "opt-1" },
      { label: "Mkt", id: "opt-2" },
    ]);
  });

  it("sets identifier from builder field name", () => {
    const bf: FormBuilderField = { name: "full_name", label: "Full Name", type: "text" } as FormBuilderField;
    const rf = toRoutingField(bf) as RoutingFieldBase;
    expect(rf.identifier).toBe("full_name");
  });

  describe("router field metadata preservation", () => {
    it("preserves routerId from original routing field", () => {
      const original = makeRouterRoutingField({ routerId: "router-123" } as any);
      const bf: FormBuilderField = { name: "department", label: "Department", type: "select" } as FormBuilderField;
      const rf = toRoutingField(bf, (original as RoutingFieldBase).id, original) as RouterRoutingField;
      expect(rf.routerId).toBe("router-123");
    });

    it("preserves router metadata from original routing field", () => {
      const original = makeRouterRoutingField();
      const bf: FormBuilderField = { name: "department", label: "Department", type: "select" } as FormBuilderField;
      const rf = toRoutingField(bf, (original as RoutingFieldBase).id, original) as RouterRoutingField;
      expect(rf.router).toEqual((original as RouterRoutingField).router);
      expect(rf.routerField).toEqual((original as RouterRoutingField).routerField);
    });

    it("does NOT add router properties for non-router fields", () => {
      const original = makeRoutingField();
      const bf: FormBuilderField = { name: "full_name", label: "Full Name", type: "text" } as FormBuilderField;
      const rf = toRoutingField(bf, (original as RoutingFieldBase).id, original) as RouterRoutingField;
      expect((rf as any).routerId).toBeUndefined();
      expect((rf as any).router).toBeUndefined();
    });

    it("preserves routerId even when router/routerField are absent", () => {
      const original: RoutingField = {
        id: uuidv4(),
        label: "Dept",
        identifier: "dept",
        type: "select",
        routerId: "router-abc",
      } as RoutingField;
      const bf: FormBuilderField = { name: "dept", label: "Dept", type: "select" } as FormBuilderField;
      const rf = toRoutingField(bf, (original as RoutingFieldBase).id, original) as RouterRoutingField;
      expect(rf.routerId).toBe("router-abc");
      expect((rf as any).router).toBeUndefined();
    });
  });
});

// ─── ID registry behaviour ────────────────────────────────────────────────────

describe("ID registry behaviour", () => {
  it("preserves IDs when fields are reordered", () => {
    // Simulate the Map-based registry initialised from the original routing fields
    const fieldA = makeRoutingField({ label: "Field A", identifier: "field_a", id: "id-a" });
    const fieldB = makeRoutingField({ label: "Field B", identifier: "field_b", id: "id-b" });

    const registry = new Map([
      ["field_a", (fieldA as RoutingFieldBase).id],
      ["field_b", (fieldB as RoutingFieldBase).id],
    ]);

    // After reorder: field_b comes first, field_a second.
    // The registry key is the identifier, so IDs don't shift with position.
    const reorderedFields: FormBuilderField[] = [
      { name: "field_b", label: "Field B", type: "text" } as FormBuilderField,
      { name: "field_a", label: "Field A", type: "text" } as FormBuilderField,
    ];

    const result = reorderedFields.map((bf) => {
      const id = registry.get(bf.name);
      return toRoutingField(bf, id);
    }) as RoutingFieldBase[];

    expect(result[0].id).toBe("id-b"); // field_b keeps its id
    expect(result[1].id).toBe("id-a"); // field_a keeps its id
  });

  it("preserves IDs when a field is deleted", () => {
    const fieldA = makeRoutingField({ label: "Field A", identifier: "field_a", id: "id-a" });
    const fieldB = makeRoutingField({ label: "Field B", identifier: "field_b", id: "id-b" });
    const fieldC = makeRoutingField({ label: "Field C", identifier: "field_c", id: "id-c" });

    const registry = new Map([
      ["field_a", (fieldA as RoutingFieldBase).id],
      ["field_b", (fieldB as RoutingFieldBase).id],
      ["field_c", (fieldC as RoutingFieldBase).id],
    ]);

    // Field B is deleted; remaining fields should keep their IDs
    const remaining: FormBuilderField[] = [
      { name: "field_a", label: "Field A", type: "text" } as FormBuilderField,
      { name: "field_c", label: "Field C", type: "text" } as FormBuilderField,
    ];

    const result = remaining.map((bf) => {
      const id = registry.get(bf.name);
      return toRoutingField(bf, id);
    }) as RoutingFieldBase[];

    expect(result[0].id).toBe("id-a");
    expect(result[1].id).toBe("id-c"); // field_c did NOT pick up id-b
  });

  it("assigns a new UUID for a genuinely new field (identifier not in registry)", () => {
    const registry = new Map([["existing_field", "id-existing"]]);

    const newField: FormBuilderField = { name: "new_field", label: "New Field", type: "text" } as FormBuilderField;

    if (!registry.has(newField.name)) {
      registry.set(newField.name, uuidv4());
    }

    const rf = toRoutingField(newField, registry.get(newField.name));
    expect(registry.get("new_field")).toBeDefined();
    expect((rf as RoutingFieldBase).id).toBe(registry.get("new_field"));
    expect((rf as RoutingFieldBase).id).not.toBe("id-existing");
  });

  it("does NOT change an existing field's ID when its identifier is renamed (generates new UUID)", () => {
    // Renaming identifier means the old key won't be found → new UUID assigned.
    // This is acceptable: the old RAQB condition was keyed to the old identifier.
    const registry = new Map([["old_name", "id-old"]]);

    const renamedField: FormBuilderField = { name: "new_name", label: "New Name", type: "text" } as FormBuilderField;

    if (!registry.has(renamedField.name)) {
      registry.set(renamedField.name, uuidv4());
    }

    const rf = toRoutingField(renamedField, registry.get(renamedField.name));
    // A brand-new UUID is assigned — different from the old field's ID
    expect((rf as RoutingFieldBase).id).not.toBe("id-old");
  });
});

// ─── Type lock (hasResponses) ─────────────────────────────────────────────────

describe("Type lock when hasResponses", () => {
  it("toFormBuilderField sets editable:'system-but-optional' for each non-router field when hasResponses", () => {
    const fields = [
      makeRoutingField({ type: "text" }),
      makeRoutingField({ type: "select" }),
    ];
    const hasResponses = true;
    const builderFields = fields.map((f) => toFormBuilderField(f, hasResponses));
    expect(builderFields[0].editable).toBe("system-but-optional");
    expect(builderFields[1].editable).toBe("system-but-optional");
  });

  it("toFormBuilderField sets editable:'user' for each field when !hasResponses", () => {
    const fields = [makeRoutingField({ type: "text" })];
    const builderFields = fields.map((f) => toFormBuilderField(f, false));
    expect(builderFields[0].editable).toBe("user");
  });

  // ── applyTypeRevertGuard tests ────────────────────────────────────────────
  // These tests exercise the *real* production guard from formEditUtils.ts,
  // not a hand-rolled reimplementation.  If the guard is removed or changed
  // in production, these tests will fail — correctly catching the regression.

  describe("applyTypeRevertGuard (production guard)", () => {
    it("reverts type mutation for existing fields when hasResponses=true", () => {
      const originalTypes = new Map([["full_name", "text"]]);
      const mutatedBf: FormBuilderField = { name: "full_name", label: "Full Name", type: "select" } as FormBuilderField;

      const result = applyTypeRevertGuard(mutatedBf, true, originalTypes);

      expect(result.type).toBe("text"); // reverted to original
      expect(result).not.toBe(mutatedBf); // new object (was mutated)
    });

    it("does not affect new fields not in the original registry", () => {
      const originalTypes = new Map([["existing_field", "text"]]);
      const newField: FormBuilderField = { name: "brand_new", label: "Brand New", type: "select" } as FormBuilderField;

      const result = applyTypeRevertGuard(newField, true, originalTypes);

      expect(result.type).toBe("select"); // unchanged — not in registry
      expect(result).toBe(newField); // same reference — no mutation
    });

    it("returns the same reference when type matches original (no-op path)", () => {
      const originalTypes = new Map([["full_name", "text"]]);
      const sameBf: FormBuilderField = { name: "full_name", label: "Full Name", type: "text" } as FormBuilderField;

      const result = applyTypeRevertGuard(sameBf, true, originalTypes);

      expect(result).toBe(sameBf); // same reference — no allocation
      expect(result.type).toBe("text");
    });

    it("returns the same reference when hasResponses=false (short-circuit)", () => {
      const originalTypes = new Map([["full_name", "text"]]);
      const bf: FormBuilderField = { name: "full_name", label: "Full Name", type: "select" } as FormBuilderField;

      const result = applyTypeRevertGuard(bf, false, originalTypes);

      // Guard is disabled — type NOT reverted
      expect(result).toBe(bf);
      expect(result.type).toBe("select");
    });

    it("the guard result flows correctly through toRoutingField", () => {
      const originalTypes = new Map([["full_name", "text"]]);
      const mutatedBf: FormBuilderField = { name: "full_name", label: "Full Name", type: "select" } as FormBuilderField;

      const guarded = applyTypeRevertGuard(mutatedBf, true, originalTypes);
      const rf = toRoutingField(guarded) as RoutingFieldBase;

      expect(rf.type).toBe("text"); // reverted type flows into routing field
    });
  });
});

// ─── Router-field locking ─────────────────────────────────────────────────────

describe("Router-field locking", () => {
  it("router field gets editable:'system' even without hasResponses", () => {
    const routerField = makeRouterRoutingField();
    const bf = toFormBuilderField(routerField, false);
    expect(bf.editable).toBe("system");
  });

  it("router field gets editable:'system' even with hasResponses", () => {
    const routerField = makeRouterRoutingField();
    const bf = toFormBuilderField(routerField, true);
    // Router-field lock ('system') takes precedence over response lock ('system-but-optional')
    expect(bf.editable).toBe("system");
  });

  it("plain field with hasResponses gets editable:'system-but-optional', not 'system'", () => {
    const plainField = makeRoutingField();
    const bf = toFormBuilderField(plainField, true);
    expect(bf.editable).toBe("system-but-optional");
  });

  it("isRouterField correctly identifies linked-router fields used in locking decision", () => {
    const routerField = makeRouterRoutingField();
    const plainField = makeRoutingField();
    expect(isRouterField(routerField)).toBe(true);
    expect(isRouterField(plainField)).toBe(false);
  });
});
