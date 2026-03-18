import type { raqbQueryValueSchema } from "@calcom/lib/raqb/zod";
import type { z } from "zod";

import type { zodFieldView, zodNonRouterRoute } from "../zod";

type Route = z.infer<typeof zodNonRouterRoute>;
type Field = z.infer<typeof zodFieldView>;
type RaqbQueryValue = z.infer<typeof raqbQueryValueSchema>;

interface RuleProperties {
  field: string;
  operator: string;
  value: (string | number | string[])[];
  valueType?: string[];
}

interface Rule {
  type: "rule" | "rule_group";
  properties: RuleProperties;
  children1?: Record<string, Rule>;
}

interface QueryValue {
  id?: string;
  type: "group" | "switch_group";
  children1?: Record<string, Rule>;
  properties?: {
    conjunction?: "AND" | "OR";
  };
}

function toQueryValue(raqbValue: RaqbQueryValue): QueryValue {
  return raqbValue as QueryValue;
}

export interface ShadowedRoute {
  routeId: string;
  routeName: string;
  shadowedByRouteId: string;
  shadowedByRouteName: string;
  reason: string;
}

export interface AnalyzeRoutesResult {
  shadowedRoutes: ShadowedRoute[];
  hasIssues: boolean;
}

type FlatValue = (string | number)[];

interface CoverageContext {
  operatorA: string;
  flatValueA: FlatValue;
  operatorB: string;
  flatValueB: FlatValue;
}

const VALUE_REQUIRING_OPERATORS = new Set([
  "equal",
  "like",
  "starts_with",
  "greater",
  "greater_or_equal",
  "less",
  "less_or_equal",
  "between",
  "select_equals",
  "select_any_in",
  "multiselect_equals",
  "multiselect_some_in",
]);

// String comparison utilities
function includesCaseInsensitive(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function startsWithCaseInsensitive(str: string, prefix: string): boolean {
  return str.toLowerCase().startsWith(prefix.toLowerCase());
}

function equalsCaseInsensitive(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

function numericValueCoveredBy({ operatorA, flatValueA, operatorB, flatValueB }: CoverageContext): boolean {
  const numA = Number(flatValueA[0]);
  const numB = Number(flatValueB[0]);

  if (operatorA === "not_equal" || operatorB === "not_equal") {
    return false;
  }

  if (operatorA === "equal" && operatorB === "equal") {
    return numA === numB;
  }

  if (operatorA === "equal") {
    return false;
  }

  if (operatorA === "greater") {
    if (operatorB === "equal") return numB > numA;
    if (operatorB === "greater") return numB >= numA;
    if (operatorB === "greater_or_equal") return numB > numA;
    if (operatorB === "between" && flatValueB.length >= 2) {
      const minB = Number(flatValueB[0]);
      return minB > numA;
    }
    return false;
  }

  if (operatorA === "greater_or_equal") {
    if (operatorB === "equal") return numB >= numA;
    if (operatorB === "greater") return numB >= numA;
    if (operatorB === "greater_or_equal") return numB >= numA;
    if (operatorB === "between" && flatValueB.length >= 2) {
      const minB = Number(flatValueB[0]);
      return minB >= numA;
    }
    return false;
  }

  if (operatorA === "less") {
    if (operatorB === "equal") return numB < numA;
    if (operatorB === "less") return numB <= numA;
    if (operatorB === "less_or_equal") return numB < numA;
    if (operatorB === "between" && flatValueB.length >= 2) {
      const maxB = Number(flatValueB[1]);
      return maxB < numA;
    }
    return false;
  }

  if (operatorA === "less_or_equal") {
    if (operatorB === "equal") return numB <= numA;
    if (operatorB === "less") return numB <= numA;
    if (operatorB === "less_or_equal") return numB <= numA;
    if (operatorB === "between" && flatValueB.length >= 2) {
      const maxB = Number(flatValueB[1]);
      return maxB <= numA;
    }
    return false;
  }

  if (operatorA === "between" && flatValueA.length >= 2) {
    const minA = Number(flatValueA[0]);
    const maxA = Number(flatValueA[1]);

    if (operatorB === "equal") {
      return numB >= minA && numB <= maxA;
    }

    if (operatorB === "between" && flatValueB.length >= 2) {
      const minB = Number(flatValueB[0]);
      const maxB = Number(flatValueB[1]);
      return minB >= minA && maxB <= maxA;
    }

    return false;
  }

  return false;
}

function selectValueCoveredBy({ operatorA, flatValueA, operatorB, flatValueB }: CoverageContext): boolean {
  if (
    operatorA === "select_not_equals" ||
    operatorA === "select_not_any_in" ||
    operatorB === "select_not_equals" ||
    operatorB === "select_not_any_in"
  ) {
    return false;
  }

  const strA = String(flatValueA[0]);
  const strB = String(flatValueB[0]);

  if (operatorA === "select_equals" && operatorB === "select_equals") {
    return strA === strB;
  }

  if (operatorA === "select_any_in") {
    const setA = new Set(flatValueA.map(String));
    if (operatorB === "select_equals") {
      return setA.has(strB);
    }
    if (operatorB === "select_any_in") {
      return flatValueB.every((v) => setA.has(String(v)));
    }
  }

  return false;
}

function multiselectValueCoveredBy({ operatorA, flatValueA, operatorB, flatValueB }: CoverageContext): boolean {
  if (operatorA === "multiselect_not_equals" || operatorB === "multiselect_not_equals") {
    return false;
  }

  const setA = new Set(flatValueA.map(String));

  if (operatorA === "multiselect_some_in") {
    if (operatorB === "multiselect_some_in") {
      return flatValueB.every((v) => setA.has(String(v)));
    }
    if (operatorB === "multiselect_equals") {
      return flatValueB.some((v) => setA.has(String(v)));
    }
  }

  if (operatorA === "multiselect_equals" && operatorB === "multiselect_equals") {
    const setB = new Set(flatValueB.map(String));
    if (setA.size !== setB.size) return false;
    return flatValueA.every((v) => setB.has(String(v)));
  }

  return false;
}

function textValueCoveredBy({ operatorA, flatValueA, operatorB, flatValueB }: CoverageContext): boolean {
  const strA = String(flatValueA[0] ?? "");
  const strB = String(flatValueB[0] ?? "");

  if (
    operatorA === "not_equal" ||
    operatorA === "not_like" ||
    operatorB === "not_equal" ||
    operatorB === "not_like"
  ) {
    return false;
  }

  if (operatorA === "equal" && operatorB === "equal") {
    return equalsCaseInsensitive(strA, strB);
  }

  if (operatorA === "like" && operatorB === "equal") {
    return includesCaseInsensitive(strB, strA);
  }

  if (operatorA === "like" && operatorB === "like") {
    return includesCaseInsensitive(strB, strA);
  }

  if (operatorA === "like" && operatorB === "starts_with") {
    return includesCaseInsensitive(strB, strA);
  }

  if (operatorA === "starts_with" && operatorB === "equal") {
    return startsWithCaseInsensitive(strB, strA);
  }

  if (operatorA === "starts_with" && operatorB === "starts_with") {
    return startsWithCaseInsensitive(strB, strA);
  }

  return false;
}

// Strategy map
type CoverageStrategy = (context: CoverageContext) => boolean;

const coverageStrategies: Record<string, CoverageStrategy> = {
  number: numericValueCoveredBy,
  select: selectValueCoveredBy,
  multiselect: multiselectValueCoveredBy,
  text: textValueCoveredBy,
  email: textValueCoveredBy,
  phone: textValueCoveredBy,
  textarea: textValueCoveredBy,
};

// Query helpers
function extractRules(queryValue: QueryValue): Rule[] {
  if (!queryValue.children1) return [];
  return Object.values(queryValue.children1).filter(
    (child): child is Rule => child.type === "rule" && !!child.properties
  );
}

function getConjunction(queryValue: QueryValue): "AND" | "OR" {
  return queryValue.properties?.conjunction ?? "AND";
}

function isNotEmptyCoverage(
  operatorA: string,
  valueB: (string | number | string[])[],
  operatorB: string
): boolean {
  if (operatorA !== "is_not_empty") return false;
  if (!VALUE_REQUIRING_OPERATORS.has(operatorB)) return false;

  const flatB = valueB.flat();
  return flatB.length > 0 && flatB.some((v) => String(v) !== "");
}

// Returns true if any input matching B's condition would also match A's condition
function valueCoveredBy(
  fieldType: string,
  operatorA: string,
  valueA: (string | number | string[])[],
  operatorB: string,
  valueB: (string | number | string[])[]
): boolean {
  const flatValueA = valueA.flat();
  const flatValueB = valueB.flat();

  if (operatorA === "is_empty" && operatorB === "is_empty") return true;
  if (operatorA === "is_not_empty" && operatorB === "is_not_empty") return true;
  if (isNotEmptyCoverage(operatorA, valueB, operatorB)) return true;

  const strategy = coverageStrategies[fieldType];
  if (!strategy) return false;

  return strategy({ operatorA, flatValueA, operatorB, flatValueB });
}

function conditionCovers(ruleA: Rule, ruleB: Rule, fieldsMap: Map<string, Field>): boolean {
  const { field: fieldIdA, operator: operatorA, value: valueA } = ruleA.properties;
  const { field: fieldIdB, operator: operatorB, value: valueB } = ruleB.properties;

  if (fieldIdA !== fieldIdB) return false;

  const field = fieldsMap.get(fieldIdA);
  const fieldType = field?.type ?? "text";

  return valueCoveredBy(fieldType, operatorA, valueA ?? [], operatorB, valueB ?? []);
}

function routeShadows(routeA: Route, routeB: Route, fieldsMap: Map<string, Field>): boolean {
  if (routeA.isFallback || routeB.isFallback) return false;

  const queryValueA = toQueryValue(routeA.queryValue);
  const queryValueB = toQueryValue(routeB.queryValue);

  const rulesA = extractRules(queryValueA);
  const rulesB = extractRules(queryValueB);

  const conjunctionA = getConjunction(queryValueA);
  const conjunctionB = getConjunction(queryValueB);

  if (rulesA.length === 0) {
    return true;
  }

  if (rulesB.length === 0) {
    return false;
  }

  if (conjunctionA === "AND" && conjunctionB === "AND") {
    return rulesA.every((ruleA) => rulesB.some((ruleB) => conditionCovers(ruleA, ruleB, fieldsMap)));
  }

  if (conjunctionA === "OR" && conjunctionB === "OR") {
    return rulesB.every((ruleB) => rulesA.some((ruleA) => conditionCovers(ruleA, ruleB, fieldsMap)));
  }

  if (conjunctionA === "OR" && conjunctionB === "AND") {
    return rulesA.some((ruleA) => rulesB.some((ruleB) => conditionCovers(ruleA, ruleB, fieldsMap)));
  }

  return false;
}

function generateShadowReason(
  routeA: Route,
  routeB: Route,
  fieldsMap: Map<string, Field>,
  shadowingRouteName: string
): string {
  const queryValueA = toQueryValue(routeA.queryValue);
  const rulesA = extractRules(queryValueA);

  if (rulesA.length === 0) {
    return `"${shadowingRouteName}" has no conditions, so it matches all inputs before this route can be reached.`;
  }

  const queryValueB = toQueryValue(routeB.queryValue);
  const rulesB = extractRules(queryValueB);

  const overlappingFields = new Set<string>();

  for (const ruleA of rulesA) {
    for (const ruleB of rulesB) {
      if (ruleA.properties.field === ruleB.properties.field) {
        const field = fieldsMap.get(ruleA.properties.field);
        const fieldName = field?.label ?? ruleA.properties.field;
        overlappingFields.add(fieldName);
      }
    }
  }

  if (overlappingFields.size > 0) {
    return `"${shadowingRouteName}" matches the same or broader conditions on: ${Array.from(overlappingFields).join(", ")}.`;
  }

  return `"${shadowingRouteName}" will match all inputs that would match this route.`;
}

export function analyzeRoutes(routes: Route[], fields: Field[]): AnalyzeRoutesResult {
  const shadowedRoutes: ShadowedRoute[] = [];

  const fieldsMap = new Map<string, Field>();
  for (const field of fields) {
    fieldsMap.set(field.id, field);
  }

  const nonRouterRoutes = routes.filter(
    (route): route is Route => route !== null && !("isRouter" in route) && !route.isFallback
  );

  for (let i = 1; i < nonRouterRoutes.length; i++) {
    const routeB = nonRouterRoutes[i];

    for (let j = 0; j < i; j++) {
      const routeA = nonRouterRoutes[j];

      if (routeShadows(routeA, routeB, fieldsMap)) {
        const shadowedByRouteName = routeA.name ?? `Route ${j + 1}`;
        shadowedRoutes.push({
          routeId: routeB.id,
          routeName: routeB.name ?? `Route ${i + 1}`,
          shadowedByRouteId: routeA.id,
          shadowedByRouteName,
          reason: generateShadowReason(routeA, routeB, fieldsMap, shadowedByRouteName),
        });
        break;
      }
    }
  }

  return {
    shadowedRoutes,
    hasIssues: shadowedRoutes.length > 0,
  };
}
