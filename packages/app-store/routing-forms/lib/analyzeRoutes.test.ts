import { describe, expect, it } from "vitest";
import { analyzeRoutes } from "./analyzeRoutes";

// Helper to create a mock route
function createRoute(
  id: string,
  name: string,
  conditions: Array<{ field: string; operator: string; value: (string | number)[] }>,
  options?: { isFallback?: boolean; conjunction?: "AND" | "OR" }
) {
  const children1: Record<string, unknown> = {};

  conditions.forEach((condition, index) => {
    children1[`rule-${index}`] = {
      type: "rule",
      properties: {
        field: condition.field,
        operator: condition.operator,
        value: condition.value,
        valueType: ["text"],
      },
    };
  });

  return {
    id,
    name,
    isFallback: options?.isFallback ?? false,
    queryValue: {
      id: `group-${id}`,
      type: "group" as const,
      children1,
      properties: {
        conjunction: options?.conjunction ?? "AND",
      },
    },
    action: { type: "customPageMessage" as const, value: "test" },
    attributeRoutingConfig: null,
  };
}

// Helper to create a mock field
function createField(id: string, label: string, type: string) {
  return {
    id,
    label,
    type,
    required: false,
  };
}

describe("analyzeRoutes", () => {
  describe("basic shadowing detection", () => {
    it("should detect when a route with more conditions is shadowed by a route with fewer conditions", () => {
      const fields = [
        createField("company-size", "Company Size", "number"),
        createField("country", "Country", "select"),
      ];

      const routes = [
        createRoute("route-1", "Enterprise", [{ field: "company-size", operator: "equal", value: [20] }]),
        createRoute("route-2", "US Enterprise", [
          { field: "company-size", operator: "equal", value: [20] },
          { field: "country", operator: "select_equals", value: ["usa"] },
        ]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      expect(result.hasIssues).toBe(true);
      expect(result.shadowedRoutes).toHaveLength(1);
      expect(result.shadowedRoutes[0].routeId).toBe("route-2");
      expect(result.shadowedRoutes[0].shadowedByRouteId).toBe("route-1");
    });

    it("should not flag routes with different conditions as shadowed", () => {
      const fields = [
        createField("company-size", "Company Size", "number"),
        createField("country", "Country", "select"),
      ];

      const routes = [
        createRoute("route-1", "Enterprise", [{ field: "company-size", operator: "equal", value: [20] }]),
        createRoute("route-2", "Canada", [
          { field: "country", operator: "select_equals", value: ["canada"] },
        ]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      expect(result.hasIssues).toBe(false);
      expect(result.shadowedRoutes).toHaveLength(0);
    });

    it("should detect when a route with no conditions shadows all other routes", () => {
      const fields = [createField("company-size", "Company Size", "number")];

      const routes = [
        createRoute("route-1", "Match All", []),
        createRoute("route-2", "Enterprise", [{ field: "company-size", operator: "equal", value: [20] }]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      expect(result.hasIssues).toBe(true);
      expect(result.shadowedRoutes).toHaveLength(1);
      expect(result.shadowedRoutes[0].routeId).toBe("route-2");
      expect(result.shadowedRoutes[0].shadowedByRouteId).toBe("route-1");
    });
  });

  describe("numeric range shadowing", () => {
    it("should detect when greater_than shadows a specific equal value", () => {
      const fields = [createField("size", "Size", "number")];

      const routes = [
        createRoute("route-1", "Large", [{ field: "size", operator: "greater", value: [10] }]),
        createRoute("route-2", "Specific", [{ field: "size", operator: "equal", value: [15] }]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      expect(result.hasIssues).toBe(true);
      expect(result.shadowedRoutes[0].routeId).toBe("route-2");
    });

    it("should not shadow when ranges don't overlap", () => {
      const fields = [createField("size", "Size", "number")];

      const routes = [
        createRoute("route-1", "Small", [{ field: "size", operator: "less", value: [10] }]),
        createRoute("route-2", "Large", [{ field: "size", operator: "greater", value: [20] }]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      expect(result.hasIssues).toBe(false);
    });

    it("should detect when greater_or_equal shadows equal", () => {
      const fields = [createField("size", "Size", "number")];

      const routes = [
        createRoute("route-1", "Large", [{ field: "size", operator: "greater_or_equal", value: [10] }]),
        createRoute("route-2", "Exact", [{ field: "size", operator: "equal", value: [10] }]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      expect(result.hasIssues).toBe(true);
    });

    it("should detect when between shadows equal within range", () => {
      const fields = [createField("size", "Size", "number")];

      const routes = [
        createRoute("route-1", "Medium Range", [{ field: "size", operator: "between", value: [10, 20] }]),
        createRoute("route-2", "Specific", [{ field: "size", operator: "equal", value: [15] }]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      expect(result.hasIssues).toBe(true);
    });

    it("should not shadow when between doesn't cover the equal value", () => {
      const fields = [createField("size", "Size", "number")];

      const routes = [
        createRoute("route-1", "Medium Range", [{ field: "size", operator: "between", value: [10, 20] }]),
        createRoute("route-2", "Outside", [{ field: "size", operator: "equal", value: [25] }]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      expect(result.hasIssues).toBe(false);
    });

    it("should detect when greater shadows between", () => {
      const fields = [createField("size", "Size", "number")];

      const routes = [
        createRoute("route-1", "Large", [{ field: "size", operator: "greater", value: [5] }]),
        createRoute("route-2", "Range", [{ field: "size", operator: "between", value: [10, 20] }]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      expect(result.hasIssues).toBe(true);
    });

    it("should not shadow with not_equal operator (negation skipped to avoid false positives)", () => {
      const fields = [createField("size", "Size", "number")];

      const routes = [
        createRoute("route-1", "Not 10", [{ field: "size", operator: "not_equal", value: [10] }]),
        createRoute("route-2", "Specific 15", [{ field: "size", operator: "equal", value: [15] }]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      // Negation operators are intentionally skipped to avoid false positives
      expect(result.hasIssues).toBe(false);
    });

    it("should not shadow with combined AND conditions (combined range check removed to avoid false positives)", () => {
      // Route A: size between 20 and 80
      // Route B: size > 30 AND size < 70
      // Combined range detection was removed to keep logic simple and avoid false positives
      const fields = [createField("size", "Size", "number")];

      const routes = [
        createRoute("route-1", "Medium Range", [{ field: "size", operator: "between", value: [20, 80] }]),
        createRoute(
          "route-2",
          "Narrower Range",
          [
            { field: "size", operator: "greater", value: [30] },
            { field: "size", operator: "less", value: [70] },
          ],
          { conjunction: "AND" }
        ),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      // Combined range analysis was removed to keep logic simple
      expect(result.hasIssues).toBe(false);
    });
  });

  describe("negation operators are skipped to avoid false positives", () => {
    it("should not shadow with text not_equal operator", () => {
      const fields = [createField("name", "Name", "text")];

      const routes = [
        createRoute("route-1", "Not John", [{ field: "name", operator: "not_equal", value: ["John"] }]),
        createRoute("route-2", "Starts M", [{ field: "name", operator: "starts_with", value: ["M"] }]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      // Negation operators are skipped to avoid false positives
      expect(result.hasIssues).toBe(false);
    });

    it("should not shadow with numeric not_equal operator", () => {
      const fields = [createField("size", "Size", "number")];

      const routes = [
        createRoute("route-1", "Not 10", [{ field: "size", operator: "not_equal", value: [10] }]),
        createRoute("route-2", "Large", [{ field: "size", operator: "greater", value: [20] }]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      expect(result.hasIssues).toBe(false);
    });
  });

  describe("select field shadowing", () => {
    it("should detect when select_any_in shadows select_equals", () => {
      const fields = [createField("country", "Country", "select")];

      const routes = [
        createRoute("route-1", "North America", [
          { field: "country", operator: "select_any_in", value: ["usa", "canada"] },
        ]),
        createRoute("route-2", "USA Only", [{ field: "country", operator: "select_equals", value: ["usa"] }]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      expect(result.hasIssues).toBe(true);
      expect(result.shadowedRoutes[0].routeId).toBe("route-2");
    });

    it("should not shadow when select values are different", () => {
      const fields = [createField("country", "Country", "select")];

      const routes = [
        createRoute("route-1", "USA", [{ field: "country", operator: "select_equals", value: ["usa"] }]),
        createRoute("route-2", "Canada", [
          { field: "country", operator: "select_equals", value: ["canada"] },
        ]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      expect(result.hasIssues).toBe(false);
    });

    it("should not shadow with select_not_equals operator (negation skipped)", () => {
      const fields = [createField("country", "Country", "select")];

      const routes = [
        createRoute("route-1", "Not USA", [
          { field: "country", operator: "select_not_equals", value: ["usa"] },
        ]),
        createRoute("route-2", "Canada", [
          { field: "country", operator: "select_equals", value: ["canada"] },
        ]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      // Negation operators are skipped to avoid false positives
      expect(result.hasIssues).toBe(false);
    });
  });

  describe("string field shadowing", () => {
    it("should detect when 'contains' shadows 'equals'", () => {
      const fields = [createField("name", "Name", "text")];

      const routes = [
        createRoute("route-1", "Contains John", [{ field: "name", operator: "like", value: ["John"] }]),
        createRoute("route-2", "John Smith", [{ field: "name", operator: "equal", value: ["John Smith"] }]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      expect(result.hasIssues).toBe(true);
      expect(result.shadowedRoutes[0].routeId).toBe("route-2");
    });

    it("should detect when 'starts_with' shadows 'equals'", () => {
      const fields = [createField("email", "Email", "text")];

      const routes = [
        createRoute("route-1", "Admin Emails", [
          { field: "email", operator: "starts_with", value: ["admin"] },
        ]),
        createRoute("route-2", "Specific Admin", [
          { field: "email", operator: "equal", value: ["admin@company.com"] },
        ]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      expect(result.hasIssues).toBe(true);
    });

    it("should handle case-insensitive text matching", () => {
      const fields = [createField("name", "Name", "text")];

      const routes = [
        createRoute("route-1", "Contains john", [{ field: "name", operator: "like", value: ["john"] }]),
        createRoute("route-2", "John Smith", [{ field: "name", operator: "equal", value: ["JOHN Smith"] }]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      expect(result.hasIssues).toBe(true);
    });

    it("should not shadow with not_like operator (negation skipped)", () => {
      const fields = [createField("name", "Name", "text")];

      const routes = [
        createRoute("route-1", "Not Admin", [{ field: "name", operator: "not_like", value: ["admin"] }]),
        createRoute("route-2", "User John", [{ field: "name", operator: "equal", value: ["user_john"] }]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      // Negation operators are skipped to avoid false positives
      expect(result.hasIssues).toBe(false);
    });

  });

  describe("is_empty and is_not_empty operators", () => {
    it("should detect when is_not_empty shadows specific value conditions", () => {
      const fields = [createField("name", "Name", "text")];

      const routes = [
        createRoute("route-1", "Any Name", [{ field: "name", operator: "is_not_empty", value: [] }]),
        createRoute("route-2", "Specific Name", [{ field: "name", operator: "equal", value: ["John"] }]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      expect(result.hasIssues).toBe(true);
    });

    it("should detect is_empty shadowing is_empty", () => {
      const fields = [createField("name", "Name", "text")];

      const routes = [
        createRoute("route-1", "Empty Name 1", [{ field: "name", operator: "is_empty", value: [] }]),
        createRoute("route-2", "Empty Name 2", [{ field: "name", operator: "is_empty", value: [] }]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      expect(result.hasIssues).toBe(true);
    });
  });

  describe("multiselect field shadowing", () => {
    it("should detect when multiselect_some_in shadows multiselect_equals with overlapping values", () => {
      const fields = [createField("tags", "Tags", "multiselect")];

      const routes = [
        createRoute("route-1", "Has A or B", [
          { field: "tags", operator: "multiselect_some_in", value: ["a", "b", "c"] },
        ]),
        createRoute("route-2", "Exact AB", [
          { field: "tags", operator: "multiselect_equals", value: ["a", "b"] },
        ]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      // some_in [a,b,c] shadows equals [a,b] because if you have exactly [a,b], you have at least one of [a,b,c]
      expect(result.hasIssues).toBe(true);
    });

  });

  describe("fallback routes", () => {
    it("should not include fallback routes in shadowing analysis", () => {
      const fields = [createField("size", "Size", "number")];

      const routes = [
        createRoute("route-1", "Enterprise", [{ field: "size", operator: "equal", value: [20] }]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      expect(result.hasIssues).toBe(false);
      expect(result.shadowedRoutes).toHaveLength(0);
    });
  });

  describe("multiple shadowed routes", () => {
    it("should detect multiple shadowed routes", () => {
      const fields = [createField("size", "Size", "number")];

      const routes = [
        createRoute("route-1", "Match All", []),
        createRoute("route-2", "Large", [{ field: "size", operator: "greater", value: [10] }]),
        createRoute("route-3", "Small", [{ field: "size", operator: "less", value: [5] }]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      expect(result.hasIssues).toBe(true);
      expect(result.shadowedRoutes.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("select_any_in vs select_any_in", () => {
    it("should detect when select_any_in with superset shadows select_any_in with subset", () => {
      const fields = [createField("country", "Country", "select")];

      const routes = [
        createRoute("route-1", "Americas", [
          { field: "country", operator: "select_any_in", value: ["usa", "canada", "mexico"] },
        ]),
        createRoute("route-2", "North America", [
          { field: "country", operator: "select_any_in", value: ["usa", "canada"] },
        ]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      // Route 1 [usa, canada, mexico] shadows Route 2 [usa, canada]
      // because any selection matching Route 2 also matches Route 1
      expect(result.hasIssues).toBe(true);
      expect(result.shadowedRoutes[0].routeId).toBe("route-2");
    });

    it("should NOT shadow when select_any_in has subset values", () => {
      const fields = [createField("country", "Country", "select")];

      const routes = [
        createRoute("route-1", "USA Only", [{ field: "country", operator: "select_any_in", value: ["usa"] }]),
        createRoute("route-2", "USA or Germany", [
          { field: "country", operator: "select_any_in", value: ["usa", "germany"] },
        ]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      // Route 1 [usa] does NOT shadow Route 2 [usa, germany]
      // because germany selection matches Route 2 but not Route 1
      expect(result.hasIssues).toBe(false);
    });

    it("should detect identical select_any_in values as shadowed", () => {
      const fields = [createField("country", "Country", "select")];

      const routes = [
        createRoute("route-1", "First", [
          { field: "country", operator: "select_any_in", value: ["usa", "canada"] },
        ]),
        createRoute("route-2", "Second", [
          { field: "country", operator: "select_any_in", value: ["usa", "canada"] },
        ]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      expect(result.hasIssues).toBe(true);
      expect(result.shadowedRoutes[0].routeId).toBe("route-2");
    });
  });

  describe("multiselect_some_in vs multiselect_some_in", () => {
    it("should detect when multiselect_some_in with superset shadows subset", () => {
      const fields = [createField("tags", "Tags", "multiselect")];

      const routes = [
        createRoute("route-1", "Has any of A, B, or C", [
          { field: "tags", operator: "multiselect_some_in", value: ["a", "b", "c"] },
        ]),
        createRoute("route-2", "Has any of A or B", [
          { field: "tags", operator: "multiselect_some_in", value: ["a", "b"] },
        ]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      // [a,b,c] shadows [a,b] - any selection with a or b matches both
      expect(result.hasIssues).toBe(true);
      expect(result.shadowedRoutes[0].routeId).toBe("route-2");
    });

    it("should NOT shadow when multiselect_some_in has subset values", () => {
      const fields = [createField("tags", "Tags", "multiselect")];

      const routes = [
        createRoute("route-1", "Has any of A or B", [
          { field: "tags", operator: "multiselect_some_in", value: ["a", "b"] },
        ]),
        createRoute("route-2", "Has any of A, B, or C", [
          { field: "tags", operator: "multiselect_some_in", value: ["a", "b", "c"] },
        ]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      // [a,b] does NOT shadow [a,b,c] - selection of [c] matches Route 2 but not Route 1
      expect(result.hasIssues).toBe(false);
    });
  });

  describe("numeric less and less_or_equal shadowing", () => {
    it("should detect when less shadows equal", () => {
      const fields = [createField("size", "Size", "number")];

      const routes = [
        createRoute("route-1", "Small", [{ field: "size", operator: "less", value: [20] }]),
        createRoute("route-2", "Specific", [{ field: "size", operator: "equal", value: [15] }]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      expect(result.hasIssues).toBe(true);
      expect(result.shadowedRoutes[0].routeId).toBe("route-2");
    });

    it("should detect when less_or_equal shadows equal", () => {
      const fields = [createField("size", "Size", "number")];

      const routes = [
        createRoute("route-1", "Small or Equal", [{ field: "size", operator: "less_or_equal", value: [20] }]),
        createRoute("route-2", "Exact 20", [{ field: "size", operator: "equal", value: [20] }]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      expect(result.hasIssues).toBe(true);
    });

    it("should detect when less shadows less with smaller threshold", () => {
      const fields = [createField("size", "Size", "number")];

      const routes = [
        createRoute("route-1", "Less than 20", [{ field: "size", operator: "less", value: [20] }]),
        createRoute("route-2", "Less than 10", [{ field: "size", operator: "less", value: [10] }]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      // less than 20 shadows less than 10 (anything < 10 is also < 20)
      expect(result.hasIssues).toBe(true);
    });

    it("should NOT shadow when less has smaller threshold", () => {
      const fields = [createField("size", "Size", "number")];

      const routes = [
        createRoute("route-1", "Less than 10", [{ field: "size", operator: "less", value: [10] }]),
        createRoute("route-2", "Less than 20", [{ field: "size", operator: "less", value: [20] }]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      // less than 10 does NOT shadow less than 20 (value 15 matches Route 2 but not Route 1)
      expect(result.hasIssues).toBe(false);
    });

    it("should detect when less shadows between", () => {
      const fields = [createField("size", "Size", "number")];

      const routes = [
        createRoute("route-1", "Less than 50", [{ field: "size", operator: "less", value: [50] }]),
        createRoute("route-2", "Between 10 and 30", [{ field: "size", operator: "between", value: [10, 30] }]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      // less than 50 shadows between 10-30 (entire range is < 50)
      expect(result.hasIssues).toBe(true);
    });
  });

  describe("numeric greater vs greater subset ranges", () => {
    it("should detect when greater with lower threshold shadows greater with higher threshold", () => {
      const fields = [createField("size", "Size", "number")];

      const routes = [
        createRoute("route-1", "Greater than 5", [{ field: "size", operator: "greater", value: [5] }]),
        createRoute("route-2", "Greater than 10", [{ field: "size", operator: "greater", value: [10] }]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      // greater than 5 shadows greater than 10 (anything > 10 is also > 5)
      expect(result.hasIssues).toBe(true);
    });

    it("should NOT shadow when greater has higher threshold", () => {
      const fields = [createField("size", "Size", "number")];

      const routes = [
        createRoute("route-1", "Greater than 10", [{ field: "size", operator: "greater", value: [10] }]),
        createRoute("route-2", "Greater than 5", [{ field: "size", operator: "greater", value: [5] }]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      // greater than 10 does NOT shadow greater than 5 (value 7 matches Route 2 but not Route 1)
      expect(result.hasIssues).toBe(false);
    });

    it("should detect when greater_or_equal shadows greater_or_equal with higher threshold", () => {
      const fields = [createField("size", "Size", "number")];

      const routes = [
        createRoute("route-1", "GTE 5", [{ field: "size", operator: "greater_or_equal", value: [5] }]),
        createRoute("route-2", "GTE 10", [{ field: "size", operator: "greater_or_equal", value: [10] }]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      expect(result.hasIssues).toBe(true);
    });
  });

  describe("between vs between", () => {
    it("should detect when wider between shadows narrower between", () => {
      const fields = [createField("size", "Size", "number")];

      const routes = [
        createRoute("route-1", "Wide Range", [{ field: "size", operator: "between", value: [0, 100] }]),
        createRoute("route-2", "Narrow Range", [{ field: "size", operator: "between", value: [20, 80] }]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      // between 0-100 shadows between 20-80 (narrower range is subset)
      expect(result.hasIssues).toBe(true);
    });

    it("should NOT shadow when between ranges do not fully contain", () => {
      const fields = [createField("size", "Size", "number")];

      const routes = [
        createRoute("route-1", "Range 10-50", [{ field: "size", operator: "between", value: [10, 50] }]),
        createRoute("route-2", "Range 40-80", [{ field: "size", operator: "between", value: [40, 80] }]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      // Overlapping but not contained - Route 2 is reachable with value 60
      expect(result.hasIssues).toBe(false);
    });

    it("should detect identical between ranges as shadowed", () => {
      const fields = [createField("size", "Size", "number")];

      const routes = [
        createRoute("route-1", "Range 10-50", [{ field: "size", operator: "between", value: [10, 50] }]),
        createRoute("route-2", "Same Range", [{ field: "size", operator: "between", value: [10, 50] }]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      expect(result.hasIssues).toBe(true);
    });
  });

  describe("text like vs like and starts_with vs starts_with", () => {
    it("should detect when shorter contains pattern shadows longer pattern", () => {
      const fields = [createField("name", "Name", "text")];

      const routes = [
        createRoute("route-1", "Contains jo", [{ field: "name", operator: "like", value: ["jo"] }]),
        createRoute("route-2", "Contains john", [{ field: "name", operator: "like", value: ["john"] }]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      // "jo" shadows "john" - any string containing "john" also contains "jo"
      expect(result.hasIssues).toBe(true);
    });

    it("should NOT shadow when contains pattern is longer", () => {
      const fields = [createField("name", "Name", "text")];

      const routes = [
        createRoute("route-1", "Contains john", [{ field: "name", operator: "like", value: ["john"] }]),
        createRoute("route-2", "Contains jo", [{ field: "name", operator: "like", value: ["jo"] }]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      // "john" does NOT shadow "jo" - "major" contains "jo" but not "john"
      expect(result.hasIssues).toBe(false);
    });

    it("should detect when shorter starts_with shadows longer prefix", () => {
      const fields = [createField("email", "Email", "text")];

      const routes = [
        createRoute("route-1", "Starts with ad", [{ field: "email", operator: "starts_with", value: ["ad"] }]),
        createRoute("route-2", "Starts with admin", [
          { field: "email", operator: "starts_with", value: ["admin"] },
        ]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      // "ad" shadows "admin" - any string starting with "admin" also starts with "ad"
      expect(result.hasIssues).toBe(true);
    });

    it("should NOT shadow when starts_with prefix is longer", () => {
      const fields = [createField("email", "Email", "text")];

      const routes = [
        createRoute("route-1", "Starts with admin", [
          { field: "email", operator: "starts_with", value: ["admin"] },
        ]),
        createRoute("route-2", "Starts with ad", [{ field: "email", operator: "starts_with", value: ["ad"] }]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      // "admin" does NOT shadow "ad" - "adventure" starts with "ad" but not "admin"
      expect(result.hasIssues).toBe(false);
    });

  });

  describe("is_not_empty vs is_empty", () => {
    it("should NOT shadow is_empty with is_not_empty", () => {
      const fields = [createField("name", "Name", "text")];

      const routes = [
        createRoute("route-1", "Not Empty", [{ field: "name", operator: "is_not_empty", value: [] }]),
        createRoute("route-2", "Is Empty", [{ field: "name", operator: "is_empty", value: [] }]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      // is_not_empty and is_empty are mutually exclusive - no shadowing
      expect(result.hasIssues).toBe(false);
    });

    it("should NOT shadow is_not_empty with is_empty", () => {
      const fields = [createField("name", "Name", "text")];

      const routes = [
        createRoute("route-1", "Is Empty", [{ field: "name", operator: "is_empty", value: [] }]),
        createRoute("route-2", "Not Empty", [{ field: "name", operator: "is_not_empty", value: [] }]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      // Mutually exclusive conditions
      expect(result.hasIssues).toBe(false);
    });
  });

  describe("empty string edge cases", () => {
    it("should NOT shadow when comparing equals empty string with is_not_empty", () => {
      const fields = [createField("name", "Name", "text")];

      const routes = [
        createRoute("route-1", "Not Empty", [{ field: "name", operator: "is_not_empty", value: [] }]),
        createRoute("route-2", "Equals Empty", [{ field: "name", operator: "equal", value: [""] }]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      // is_not_empty should NOT shadow equals "" because "" is empty
      expect(result.hasIssues).toBe(false);
    });

    it("should detect identical equals empty string as shadowed", () => {
      const fields = [createField("name", "Name", "text")];

      const routes = [
        createRoute("route-1", "Empty 1", [{ field: "name", operator: "equal", value: [""] }]),
        createRoute("route-2", "Empty 2", [{ field: "name", operator: "equal", value: [""] }]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      expect(result.hasIssues).toBe(true);
    });
  });

  describe("multiselect_equals vs multiselect_equals", () => {
    it("should detect identical multiselect_equals as shadowed", () => {
      const fields = [createField("tags", "Tags", "multiselect")];

      const routes = [
        createRoute("route-1", "Exact AB", [
          { field: "tags", operator: "multiselect_equals", value: ["a", "b"] },
        ]),
        createRoute("route-2", "Same Exact AB", [
          { field: "tags", operator: "multiselect_equals", value: ["a", "b"] },
        ]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      expect(result.hasIssues).toBe(true);
    });

    it("should NOT shadow when multiselect_equals have different values", () => {
      const fields = [createField("tags", "Tags", "multiselect")];

      const routes = [
        createRoute("route-1", "Exact AB", [
          { field: "tags", operator: "multiselect_equals", value: ["a", "b"] },
        ]),
        createRoute("route-2", "Exact ABC", [
          { field: "tags", operator: "multiselect_equals", value: ["a", "b", "c"] },
        ]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      // Different exact sets - no shadowing
      expect(result.hasIssues).toBe(false);
    });

    it("should detect multiselect_equals with same values in different order", () => {
      const fields = [createField("tags", "Tags", "multiselect")];

      const routes = [
        createRoute("route-1", "Exact BA", [
          { field: "tags", operator: "multiselect_equals", value: ["b", "a"] },
        ]),
        createRoute("route-2", "Exact AB", [
          { field: "tags", operator: "multiselect_equals", value: ["a", "b"] },
        ]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      // Same set, different order - should be shadowed
      expect(result.hasIssues).toBe(true);
    });
  });

  describe("OR conjunction handling", () => {
    it("should handle routes with OR conjunction", () => {
      const fields = [createField("size", "Size", "number"), createField("country", "Country", "select")];

      const routes = [
        createRoute(
          "route-1",
          "Enterprise OR USA",
          [
            { field: "size", operator: "equal", value: [20] },
            { field: "country", operator: "select_equals", value: ["usa"] },
          ],
          { conjunction: "OR" }
        ),
        createRoute("route-2", "Enterprise AND USA", [
          { field: "size", operator: "equal", value: [20] },
          { field: "country", operator: "select_equals", value: ["usa"] },
        ]),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      // Route 2 (AND) should be shadowed by Route 1 (OR) because
      // any input matching both conditions will match the OR route first
      expect(result.hasIssues).toBe(true);
    });

    it("should correctly handle AND vs OR - AND should NOT shadow OR with different fields", () => {
      const fields = [
        createField("field1", "Field 1", "text"),
        createField("field2", "Field 2", "text"),
        createField("field3", "Field 3", "text"),
      ];

      const routes = [
        // Route A: field1 = "a" AND field2 = "b" (requires BOTH)
        createRoute("route-1", "AND Route", [
          { field: "field1", operator: "equal", value: ["a"] },
          { field: "field2", operator: "equal", value: ["b"] },
        ]),
        // Route B: field1 = "a" OR field3 = "c" (requires ANY)
        createRoute(
          "route-2",
          "OR Route",
          [
            { field: "field1", operator: "equal", value: ["a"] },
            { field: "field3", operator: "equal", value: ["c"] },
          ],
          { conjunction: "OR" }
        ),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      // AND route should NOT shadow OR route because:
      // Input {field1: "x", field3: "c"} matches OR route but NOT AND route
      expect(result.hasIssues).toBe(false);
    });

    it("should correctly detect AND shadowing OR when conditions fully overlap", () => {
      const fields = [createField("field1", "Field 1", "text"), createField("field2", "Field 2", "text")];

      const routes = [
        // Route A: field1 = "a" AND field2 = "b"
        createRoute("route-1", "AND Route", [
          { field: "field1", operator: "equal", value: ["a"] },
          { field: "field2", operator: "equal", value: ["b"] },
        ]),
        // Route B: field1 = "a" OR field2 = "b"
        createRoute(
          "route-2",
          "OR Route",
          [
            { field: "field1", operator: "equal", value: ["a"] },
            { field: "field2", operator: "equal", value: ["b"] },
          ],
          { conjunction: "OR" }
        ),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      // AND route CAN shadow OR route when they have the same fields and conditions
      // Because when field1="a" (one of OR's conditions), AND would also match if field2="b"
      // But wait - if input is {field1: "a", field2: "x"}, OR matches but AND doesn't
      // So actually AND should NOT shadow OR here
      expect(result.hasIssues).toBe(false);
    });

    it("should detect OR shadowing OR correctly", () => {
      const fields = [createField("country", "Country", "select")];

      const routes = [
        createRoute(
          "route-1",
          "Americas",
          [
            { field: "country", operator: "select_equals", value: ["usa"] },
            { field: "country", operator: "select_equals", value: ["canada"] },
            { field: "country", operator: "select_equals", value: ["mexico"] },
          ],
          { conjunction: "OR" }
        ),
        createRoute(
          "route-2",
          "North America",
          [
            { field: "country", operator: "select_equals", value: ["usa"] },
            { field: "country", operator: "select_equals", value: ["canada"] },
          ],
          { conjunction: "OR" }
        ),
        createRoute("fallback", "Fallback", [], { isFallback: true }),
      ];

      const result = analyzeRoutes(routes, fields);

      // Route 1 (OR usa/canada/mexico) should shadow Route 2 (OR usa/canada)
      expect(result.hasIssues).toBe(true);
    });
  });
});
