import { beforeEach, describe, expect, it } from "vitest";

import {
  type FormBuilderField,
  type RoutingFormField,
  transformToBuilder,
  transformToRouting,
} from "./formBuilderAdapters";

describe("formBuilderAdapters", () => {
  describe("transformToBuilder", () => {
    it("should transform routing form fields to builder fields", () => {
      const routingFields: RoutingFormField[] = [
        {
          id: "field-1",
          label: "Name",
          identifier: "name",
          type: "text",
          required: true,
          placeholder: "Enter your name",
        },
      ];

      const result = transformToBuilder(routingFields);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "field-1",
        name: "name",
        label: "Name",
        type: "text",
        required: true,
        placeholder: "Enter your name",
        editable: "user",
      });
    });

    it("should handle null fields array", () => {
      const result = transformToBuilder(null);
      expect(result).toEqual([]);
    });

    it("should handle undefined fields array", () => {
      const result = transformToBuilder(undefined);
      expect(result).toEqual([]);
    });

    it("should filter out undefined entries", () => {
      const routingFields = [
        {
          id: "field-1",
          label: "Name",
          identifier: "name",
          type: "text",
        },
        undefined,
        {
          id: "field-2",
          label: "Email",
          identifier: "email",
          type: "email",
        },
      ] as (RoutingFormField | undefined)[];

      const result = transformToBuilder(routingFields);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("field-1");
      expect(result[1].id).toBe("field-2");
    });

    it("should preserve options with null id", () => {
      const routingFields: RoutingFormField[] = [
        {
          id: "field-1",
          label: "Choice",
          identifier: "choice",
          type: "select",
          options: [
            { label: "Option A", id: null },
            { label: "Option B", id: "opt-b" },
          ],
        },
      ];

      const result = transformToBuilder(routingFields);

      expect(result[0].options).toEqual([
        { label: "Option A", value: null },
        { label: "Option B", value: "opt-b" },
      ]);
    });

    it("should set editable to system-but-optional when lockType is true", () => {
      const routingFields: RoutingFormField[] = [
        {
          id: "field-1",
          label: "Name",
          identifier: "name",
          type: "text",
        },
      ];

      const result = transformToBuilder(routingFields, true);

      expect(result[0].editable).toBe("system-but-optional");
    });

    it("should set editable to user-readonly for router fields", () => {
      const routingFields: RoutingFormField[] = [
        {
          id: "field-1",
          label: "Name",
          identifier: "name",
          type: "text",
          router: "router-1" as any,
        },
      ];

      const result = transformToBuilder(routingFields);

      expect(result[0].editable).toBe("user-readonly");
    });

    it("should preserve router metadata", () => {
      const routingFields: RoutingFormField[] = [
        {
          id: "field-1",
          label: "Name",
          identifier: "name",
          type: "text",
          routerId: "router-1",
          routerField: "field-2" as any,
          router: "router-name" as any,
        },
      ];

      const result = transformToBuilder(routingFields);

      expect(result[0].routerId).toBe("router-1");
      expect(result[0].routerField).toBe("field-2");
      expect(result[0].router).toBe("router-name");
    });
  });

  describe("transformToRouting", () => {
    let fieldIdMap: Map<string, string>;

    beforeEach(() => {
      fieldIdMap = new Map();
    });

    it("should transform builder fields to routing form fields", () => {
      const builderFields: FormBuilderField[] = [
        {
          id: "field-1",
          name: "name",
          label: "Name",
          type: "text",
          required: true,
          placeholder: "Enter your name",
          editable: "user",
          sources: [],
          hidden: false,
        },
      ];

      const result = transformToRouting(builderFields, fieldIdMap, null);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "field-1",
        label: "Name",
        identifier: "name",
        type: "text",
        required: true,
        placeholder: "Enter your name",
      });
    });

    it("should handle null fields array", () => {
      const result = transformToRouting(null, fieldIdMap, null);
      expect(result).toEqual([]);
    });

    it("should handle undefined fields array", () => {
      const result = transformToRouting(undefined, fieldIdMap, null);
      expect(result).toEqual([]);
    });

    it("should filter out undefined entries", () => {
      const builderFields = [
        {
          id: "field-1",
          name: "name",
          label: "Name",
          type: "text",
          editable: "user" as const,
          sources: [],
          hidden: false,
        },
        undefined,
        {
          id: "field-2",
          name: "email",
          label: "Email",
          type: "email",
          editable: "user" as const,
          sources: [],
          hidden: false,
        },
      ] as (FormBuilderField | undefined)[];

      const result = transformToRouting(builderFields, fieldIdMap, null);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("field-1");
      expect(result[1].id).toBe("field-2");
    });

    it("should filter out fields without type", () => {
      const builderFields = [
        {
          id: "field-1",
          name: "name",
          label: "Name",
          type: "",
          editable: "user" as const,
          sources: [],
          hidden: false,
        },
        {
          id: "field-2",
          name: "email",
          label: "Email",
          type: "email",
          editable: "user" as const,
          sources: [],
          hidden: false,
        },
      ] as FormBuilderField[];

      const result = transformToRouting(builderFields, fieldIdMap, null);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("field-2");
    });

    it("should preserve field IDs using fieldIdMap", () => {
      fieldIdMap.set("name", "existing-id");

      const builderFields: FormBuilderField[] = [
        {
          id: "temp-id",
          name: "name",
          label: "Name",
          type: "text",
          editable: "user",
          sources: [],
          hidden: false,
        },
      ];

      const result = transformToRouting(builderFields, fieldIdMap, null);

      expect(result[0].id).toBe("existing-id");
    });

    it("should generate new ID and update map for new fields", () => {
      const builderFields: FormBuilderField[] = [
        {
          id: "temp-id",
          name: "newField",
          label: "New Field",
          type: "text",
          editable: "user",
          sources: [],
          hidden: false,
        },
      ];

      const result = transformToRouting(builderFields, fieldIdMap, null);

      expect(result[0].id).toBeTruthy();
      expect(fieldIdMap.get("newField")).toBe(result[0].id);
    });

    it("should preserve router metadata from previous fields", () => {
      const previousFields: RoutingFormField[] = [
        {
          id: "field-1",
          label: "Name",
          identifier: "name",
          type: "text",
          routerId: "router-1",
          routerField: "field-2" as any,
          router: "router-name" as any,
        },
      ];

      fieldIdMap.set("name", "field-1");

      const builderFields: FormBuilderField[] = [
        {
          id: "field-1",
          name: "name",
          label: "Name Updated",
          type: "text",
          editable: "user",
          sources: [],
          hidden: false,
        },
      ];

      const result = transformToRouting(builderFields, fieldIdMap, previousFields);

      expect(result[0].routerId).toBe("router-1");
      expect(result[0].routerField).toBe("field-2");
      expect(result[0].router).toBe("router-name");
    });

    it("should handle new router metadata override", () => {
      const previousFields: RoutingFormField[] = [
        {
          id: "field-1",
          label: "Name",
          identifier: "name",
          type: "text",
          routerId: "old-router",
        },
      ];

      fieldIdMap.set("name", "field-1");

      const builderFields: FormBuilderField[] = [
        {
          id: "field-1",
          name: "name",
          label: "Name",
          type: "text",
          routerId: "new-router",
          editable: "user",
          sources: [],
          hidden: false,
        },
      ];

      const result = transformToRouting(builderFields, fieldIdMap, previousFields);

      expect(result[0].routerId).toBe("new-router");
    });

    it("should handle options with null values", () => {
      const builderFields: FormBuilderField[] = [
        {
          id: "field-1",
          name: "choice",
          label: "Choice",
          type: "select",
          options: [
            { label: "Option A", value: null },
            { label: "Option B", value: "opt-b" },
          ],
          editable: "user",
          sources: [],
          hidden: false,
        },
      ];

      const result = transformToRouting(builderFields, fieldIdMap, null);

      expect(result[0].options).toEqual([
        { label: "Option A", id: null },
        { label: "Option B", id: "opt-b" },
      ]);
    });

    it("should filter out undefined options", () => {
      const builderFields: FormBuilderField[] = [
        {
          id: "field-1",
          name: "choice",
          label: "Choice",
          type: "select",
          options: [
            { label: "Option A", value: "opt-a" },
            undefined,
            { label: "Option B", value: "opt-b" },
          ] as any,
          editable: "user",
          sources: [],
          hidden: false,
        },
      ];

      const result = transformToRouting(builderFields, fieldIdMap, null);

      expect(result[0].options).toEqual([
        { label: "Option A", id: "opt-a" },
        { label: "Option B", id: "opt-b" },
      ]);
    });

    it("should provide defaults for missing option properties", () => {
      const builderFields: FormBuilderField[] = [
        {
          id: "field-1",
          name: "choice",
          label: "Choice",
          type: "select",
          options: [
            { label: undefined, value: "" },
            { label: "Option B", value: undefined },
          ],
          editable: "user",
          sources: [],
          hidden: false,
        },
      ];

      const result = transformToRouting(builderFields, fieldIdMap, null);

      expect(result[0].options).toEqual([
        { label: "", id: "" },
        { label: "Option B", id: "" },
      ]);
    });

    it("should preserve identifier from name", () => {
      const builderFields: FormBuilderField[] = [
        {
          id: "field-1",
          name: "custom_identifier",
          label: "Field 1",
          type: "text",
          editable: "user",
          sources: [],
          hidden: false,
        },
      ];

      const result = transformToRouting(builderFields, fieldIdMap, null);

      expect(result[0].identifier).toBe("custom_identifier");
    });

    it("should handle required field", () => {
      const builderFields: FormBuilderField[] = [
        {
          id: "field-1",
          name: "field_1",
          label: "Required Field",
          type: "text",
          required: true,
          editable: "user",
          sources: [],
          hidden: false,
        },
      ];

      const result = transformToRouting(builderFields, fieldIdMap, null);

      expect(result[0].required).toBe(true);
    });

    it("should handle placeholder", () => {
      const builderFields: FormBuilderField[] = [
        {
          id: "field-1",
          name: "field_1",
          label: "Field with Placeholder",
          type: "text",
          placeholder: "Enter text here",
          editable: "user",
          sources: [],
          hidden: false,
        },
      ];

      const result = transformToRouting(builderFields, fieldIdMap, null);

      expect(result[0].placeholder).toBe("Enter text here");
    });
  });
});
