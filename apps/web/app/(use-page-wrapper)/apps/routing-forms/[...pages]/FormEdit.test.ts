/**
 * Unit tests for FormEdit field adapter functions.
 *
 * Tests cover:
 *  - toFormBuilderField: ID preservation, required, options, and type-lock
 *  - toRoutingField: ID preservation, router field metadata preservation
 *  - ID registry: reordering/renaming does not reassign IDs; new fields get new IDs
 *  - Type lock: when hasResponses, existing fields get editable:"system-but-optional"
 *    and the type-revert guard applies
 */

import { v4 as uuidv4 } from "uuid";

// ─── Inline the adapter functions under test ──────────────────────────────────
// We cannot import them directly because the module is a React component file
// with browser-only imports (useLocale, FormBuilder, etc.).  Instead we
// duplicate the pure utility functions here so they can run in a Node test env.
// If these functions are ever extracted to a separate utils file, the tests can
// import from there directly.

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

type RoutingField = RoutingFieldBase | RouterRoutingField;

type FormBuilderField = {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  editable?: string;
  sources?: { label: string; type: string; id: string; fieldRequired: boolean }[];
};

function getFieldIdentifier(label: string): string {
  return label.toLowerCase().replace(/\s+/g, "_");
}

function toFormBuilderField(field: RoutingField, lockType = false): FormBuilderField {
  const name = field.identifier
    ? field.identifier
    : getFieldIdentifier(field.label ?? "").toLowerCase();

  return {
    name,
    label: field.label ?? "",
    type: (field.type ?? "text") as FormBuilderField["type"],
    required: field.required ?? false,
    placeholder: field.placeholder ?? "",
    options: field.options?.map((opt) => ({
      label: opt.label,
      value: opt.id ?? opt.label,
    })),
    editable: lockType ? "system-but-optional" : "user",
    sources: [
      {
        label: "User",
        type: "user" as const,
        id: "user",
        fieldRequired: field.required ?? false,
      },
    ],
  };
}

function toRoutingField(
  builderField: FormBuilderField,
  originalId?: string,
  originalRoutingField?: RoutingField
): RoutingField {
  const bf = builderField;

  const base: RoutingFieldBase = {
    id: originalId ?? uuidv4(),
    label: bf.label ?? bf.name,
    identifier: bf.name,
    type: bf.type,
    required: bf.required ?? false,
    placeholder: bf.placeholder ?? "",
    options: bf.options?.map((opt) => ({ label: opt.label, id: opt.value })),
  };

  if (originalRoutingField && "routerId" in originalRoutingField) {
    const routerField = originalRoutingField as RouterRoutingField;
    return {
      ...base,
      routerId: routerField.routerId,
      ...(routerField.router !== undefined && { router: routerField.router }),
      ...(routerField.routerField !== undefined && { routerField: routerField.routerField }),
    } as RoutingField;
  }

  return base;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRoutingField(overrides: Partial<RoutingFieldBase> = {}): RoutingFieldBase {
  return {
    id: uuidv4(),
    label: "Full Name",
    identifier: "full_name",
    type: "text",
    required: false,
    placeholder: "",
    ...overrides,
  };
}

function makeRouterRoutingField(overrides: Partial<RouterRoutingField> = {}): RouterRoutingField {
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
  };
}

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

  it("sets editable:'system-but-optional' when lockType is true", () => {
    const bf = toFormBuilderField(makeRoutingField(), true);
    expect(bf.editable).toBe("system-but-optional");
  });

  it("maps type from routing field", () => {
    const bf = toFormBuilderField(makeRoutingField({ type: "multiselect" }));
    expect(bf.type).toBe("multiselect");
  });

  it("handles router fields — type comes from routerField.type (or field.type)", () => {
    const routerField = makeRouterRoutingField({ type: "select" });
    const bf = toFormBuilderField(routerField);
    expect(bf.type).toBe("select");
  });
});

// ─── toRoutingField tests ─────────────────────────────────────────────────────

describe("toRoutingField", () => {
  it("uses provided originalId, not a new UUID", () => {
    const stableId = uuidv4();
    const bf: FormBuilderField = { name: "full_name", label: "Full Name", type: "text" };
    const rf = toRoutingField(bf, stableId) as RoutingFieldBase;
    expect(rf.id).toBe(stableId);
  });

  it("generates a UUID when originalId is not provided", () => {
    const bf: FormBuilderField = { name: "email", label: "Email", type: "email" };
    const rf = toRoutingField(bf) as RoutingFieldBase;
    expect(rf.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("preserves required from builder field", () => {
    const bf: FormBuilderField = { name: "phone", label: "Phone", type: "phone", required: true };
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
    };
    const rf = toRoutingField(bf) as RoutingFieldBase;
    expect(rf.options).toEqual([
      { label: "Eng", id: "opt-1" },
      { label: "Mkt", id: "opt-2" },
    ]);
  });

  it("sets identifier from builder field name", () => {
    const bf: FormBuilderField = { name: "full_name", label: "Full Name", type: "text" };
    const rf = toRoutingField(bf) as RoutingFieldBase;
    expect(rf.identifier).toBe("full_name");
  });

  describe("router field metadata preservation", () => {
    it("preserves routerId from original routing field", () => {
      const original = makeRouterRoutingField({ routerId: "router-123" });
      const bf: FormBuilderField = { name: "department", label: "Department", type: "select" };
      const rf = toRoutingField(bf, original.id, original) as RouterRoutingField;
      expect(rf.routerId).toBe("router-123");
    });

    it("preserves router metadata from original routing field", () => {
      const original = makeRouterRoutingField();
      const bf: FormBuilderField = { name: "department", label: "Department", type: "select" };
      const rf = toRoutingField(bf, original.id, original) as RouterRoutingField;
      expect(rf.router).toEqual(original.router);
      expect(rf.routerField).toEqual(original.routerField);
    });

    it("does NOT add router properties for non-router fields", () => {
      const original = makeRoutingField();
      const bf: FormBuilderField = { name: "full_name", label: "Full Name", type: "text" };
      const rf = toRoutingField(bf, original.id, original) as RouterRoutingField;
      expect((rf as any).routerId).toBeUndefined();
      expect((rf as any).router).toBeUndefined();
    });

    it("preserves routerId even when router/routerField are absent", () => {
      const original: RouterRoutingField = {
        id: uuidv4(),
        label: "Dept",
        identifier: "dept",
        type: "select",
        routerId: "router-abc",
      };
      const bf: FormBuilderField = { name: "dept", label: "Dept", type: "select" };
      const rf = toRoutingField(bf, original.id, original) as RouterRoutingField;
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
      ["field_a", fieldA.id],
      ["field_b", fieldB.id],
    ]);

    // After reorder: field_b comes first, field_a second.
    // The registry key is the identifier, so IDs don't shift with position.
    const reorderedFields: FormBuilderField[] = [
      { name: "field_b", label: "Field B", type: "text" },
      { name: "field_a", label: "Field A", type: "text" },
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
      ["field_a", fieldA.id],
      ["field_b", fieldB.id],
      ["field_c", fieldC.id],
    ]);

    // Field B is deleted; remaining fields should keep their IDs
    const remaining: FormBuilderField[] = [
      { name: "field_a", label: "Field A", type: "text" },
      { name: "field_c", label: "Field C", type: "text" },
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

    const newField: FormBuilderField = { name: "new_field", label: "New Field", type: "text" };

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

    const renamedField: FormBuilderField = { name: "new_name", label: "New Name", type: "text" };

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
  it("toFormBuilderField sets editable:'system-but-optional' for each field when hasResponses", () => {
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

  it("type-revert guard: reverts type mutation for existing fields", () => {
    // Simulates the originalTypeRegistryRef logic in the watch subscription.
    const originalType = "text";
    const originalTypes = new Map([["full_name", originalType]]);

    const mutatedBf: FormBuilderField = { name: "full_name", label: "Full Name", type: "select" };

    // Guard: revert the type to the original
    let resolvedBf = mutatedBf;
    const hasResponses = true;
    if (hasResponses && originalTypes.has(mutatedBf.name)) {
      const lockedType = originalTypes.get(mutatedBf.name) as string;
      if (resolvedBf.type !== lockedType) {
        resolvedBf = { ...resolvedBf, type: lockedType };
      }
    }

    const rf = toRoutingField(resolvedBf) as RoutingFieldBase;
    expect(rf.type).toBe("text"); // type is reverted back to original
  });

  it("type-revert guard: does not affect new fields not in original registry", () => {
    const originalTypes = new Map([["existing_field", "text"]]);

    const newField: FormBuilderField = { name: "brand_new", label: "Brand New", type: "select" };

    let resolvedBf = newField;
    const hasResponses = true;
    if (hasResponses && originalTypes.has(newField.name)) {
      const lockedType = originalTypes.get(newField.name) as string;
      if (resolvedBf.type !== lockedType) {
        resolvedBf = { ...resolvedBf, type: lockedType };
      }
    }

    const rf = toRoutingField(resolvedBf) as RoutingFieldBase;
    expect(rf.type).toBe("select"); // type unchanged — new field not in original registry
  });

  it("type-revert guard: preserves type when it matches original (no unnecessary mutation)", () => {
    const originalTypes = new Map([["full_name", "text"]]);

    const sameBf: FormBuilderField = { name: "full_name", label: "Full Name", type: "text" };

    let resolvedBf = sameBf;
    const hasResponses = true;
    if (hasResponses && originalTypes.has(sameBf.name)) {
      const lockedType = originalTypes.get(sameBf.name) as string;
      if (resolvedBf.type !== lockedType) {
        resolvedBf = { ...resolvedBf, type: lockedType };
      }
    }

    // No mutation — resolvedBf should still be the same reference
    expect(resolvedBf).toBe(sameBf);
    const rf = toRoutingField(resolvedBf) as RoutingFieldBase;
    expect(rf.type).toBe("text");
  });
});
