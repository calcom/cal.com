import { describe, expect, it } from "vitest";
import {
  type FormBuilderField,
  type RoutingField,
  transformToBuilder,
  transformToRouting,
} from "./formBuilderAdapters";

describe("formBuilderAdapters", () => {
  describe("transformToBuilder", () => {
    it("preserves id, identifier as name, label, type, required, placeholder, options", () => {
      const fields: RoutingField[] = [
        {
          id: "field-uuid-1",
          identifier: "company-size",
          label: "Company Size",
          type: "select",
          required: true,
          placeholder: "Select...",
          options: [
            { label: "Small", id: "opt-1" },
            { label: "Large", id: "opt-2" },
          ],
        },
      ];
      const result = transformToBuilder(fields);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "field-uuid-1",
        name: "company-size",
        label: "Company Size",
        type: "select",
        required: true,
        placeholder: "Select...",
        options: [
          { label: "Small", value: "opt-1" },
          { label: "Large", value: "opt-2" },
        ],
        editable: "user",
      });
      expect(result[0].sources).toHaveLength(1);
      expect(result[0].sources[0]).toMatchObject({
        label: "User",
        type: "user",
        id: "user",
        fieldRequired: true,
      });
    });

    it("uses slugified label as name when identifier is missing", () => {
      const fields: RoutingField[] = [
        {
          id: "f1",
          label: "Company Size",
          type: "text",
        },
      ];
      const result = transformToBuilder(fields);
      expect(result[0].name).toBe("company-size");
    });

    it("preserves legacy options with null id", () => {
      const fields: RoutingField[] = [
        {
          id: "f1",
          label: "Choice",
          type: "select",
          options: [
            { label: "A", id: null },
            { label: "B", id: "id-b" },
          ],
        },
      ];
      const result = transformToBuilder(fields);
      expect(result[0].options).toEqual([
        { label: "A", value: null },
        { label: "B", value: "id-b" },
      ]);
    });

    it("sets editable to user-readonly when field has router", () => {
      const fields: (RoutingField & { router?: { name: string; description: string; id: string } })[] = [
        {
          id: "f1",
          label: "From Router",
          type: "text",
          routerId: "r1",
          routerField: {
            id: "inner-1",
            label: "Inner",
            type: "text",
          },
          router: { name: "Other Form", description: "", id: "form-1" },
        },
      ];
      const result = transformToBuilder(fields);
      expect(result[0].editable).toBe("user-readonly");
    });

    it("sets editable to system-but-optional when lockType is true", () => {
      const fields: RoutingField[] = [{ id: "f1", label: "Q", type: "text" }];
      const result = transformToBuilder(fields, true);
      expect(result[0].editable).toBe("system-but-optional");
    });

    it("returns empty array for undefined or empty input", () => {
      expect(transformToBuilder(undefined)).toEqual([]);
      expect(transformToBuilder([])).toEqual([]);
    });
  });

  describe("transformToRouting", () => {
    it("preserves id when in map and uses map for lookup", () => {
      const map = new Map<string, string>([["company-size", "original-id-123"]]);
      const builderFields: FormBuilderField[] = [
        {
          name: "company-size",
          label: "Company Size",
          type: "select",
          required: true,
          sources: [],
        },
      ];
      const result = transformToRouting(builderFields, map);
      expect(result[0].id).toBe("original-id-123");
      expect(result[0].identifier).toBe("company-size");
      expect(result[0].label).toBe("Company Size");
      expect(result[0].type).toBe("select");
    });

    it("assigns new UUID for new field and stores in map", () => {
      const map = new Map<string, string>();
      const builderFields: FormBuilderField[] = [
        {
          name: "new-field",
          label: "New Field",
          type: "text",
          required: false,
          sources: [],
        },
      ];
      const result = transformToRouting(builderFields, map);
      expect(result[0].id).toBeDefined();
      expect(result[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(map.get("new-field")).toBe(result[0].id);
    });

    it("reuses same id for same name on second call (id stability)", () => {
      const map = new Map<string, string>();
      const builderFields: FormBuilderField[] = [
        { name: "stable", label: "Stable", type: "text", required: false, sources: [] },
      ];
      const first = transformToRouting(builderFields, map);
      const second = transformToRouting(builderFields, map);
      expect(second[0].id).toBe(first[0].id);
      expect(map.get("stable")).toBe(first[0].id);
    });

    it("preserves options including null value -> null id", () => {
      const map = new Map([["f", "id-f"]]);
      const builderFields: FormBuilderField[] = [
        {
          name: "f",
          label: "F",
          type: "select",
          required: false,
          sources: [],
          options: [
            { label: "Legacy", value: null },
            { label: "With Id", value: "v2" },
          ],
        },
      ];
      const result = transformToRouting(builderFields, map);
      expect(result[0].options).toEqual([
        { label: "Legacy", id: null },
        { label: "With Id", id: "v2" },
      ]);
    });

    it("preserves router metadata from previousParentFields when builder field lacks it", () => {
      const map = new Map([["from-router", "router-field-id"]]);
      const previousParentFields: RoutingField[] = [
        {
          id: "router-field-id",
          label: "From Router",
          identifier: "from-router",
          type: "text",
          routerId: "r1",
          routerField: { id: "inner-1", label: "Inner", type: "text" },
          router: { name: "Other Form", description: "", id: "form-1" },
        } as RoutingField,
      ];
      const builderFields: FormBuilderField[] = [
        {
          name: "from-router",
          label: "From Router",
          type: "text",
          required: false,
          sources: [],
        },
      ];
      const result = transformToRouting(builderFields, map, {
        previousParentFields,
      });
      expect(result[0]).toMatchObject({
        id: "router-field-id",
        identifier: "from-router",
        routerId: "r1",
      });
      expect((result[0] as RoutingField & { router: unknown }).router).toEqual({
        name: "Other Form",
        description: "",
        id: "form-1",
      });
      expect((result[0] as RoutingField & { routerField: unknown }).routerField).toMatchObject({
        id: "inner-1",
        label: "Inner",
        type: "text",
      });
    });

    it("reverts type to original when hasResponses and originalTypeRegistry is set", () => {
      const map = new Map([["q", "id-q"]]);
      const typeRegistry = new Map([["q", "select"]]);
      const builderFields: FormBuilderField[] = [
        {
          name: "q",
          label: "Q",
          type: "text",
          required: false,
          sources: [],
        },
      ];
      const result = transformToRouting(builderFields, map, {
        hasResponses: true,
        originalTypeRegistry: typeRegistry,
      });
      expect(result[0].type).toBe("select");
    });

    it("deduplicates by name so duplicate-name rows collapse to one (avoids duplicate question in UI)", () => {
      const map = new Map([
        ["question-1", "id-1"],
        ["question-2", "id-2"],
      ]);
      const builderFields: FormBuilderField[] = [
        { name: "question-1", label: "Question 1", type: "text" },
        { name: "question-2", label: "Question 2", type: "text" },
        { name: "question-2", label: "Question 2 duplicate", type: "text" },
      ];
      const result = transformToRouting(builderFields, map);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("id-1");
      expect(result[1].id).toBe("id-2");
      expect(result[1].label).toBe("Question 2");
    });

    it("same name in two positions yields single field (first occurrence kept)", () => {
      const map = new Map([["same-name", "id-only"]]);
      const builderFields: FormBuilderField[] = [
        { name: "same-name", label: "First", type: "text" },
        { name: "same-name", label: "Second", type: "text" },
      ];
      const result = transformToRouting(builderFields, map);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("id-only");
      expect(result[0].label).toBe("First");
    });
  });
});
