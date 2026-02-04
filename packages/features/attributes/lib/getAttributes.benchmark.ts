/**
 * Benchmark comparing the performance of the old O(n*m) array-based lookups
 * vs the new O(1) Map-based lookups for attribute routing.
 *
 * Run with: npx tsx packages/features/attributes/lib/getAttributes.benchmark.ts
 */

import type { AttributeType } from "@calcom/prisma/enums";

type FullAttribute = {
  name: string;
  slug: string;
  type: AttributeType;
  id: string;
  options: {
    id: string;
    value: string;
    slug: string;
    isGroup: boolean;
    contains: string[];
  }[];
};

type AttributeOptionId = string;

// ============================================================================
// OLD IMPLEMENTATION (O(n*m) - linear scans)
// ============================================================================

function oldGetAttributeFromAttributeOption({
  allAttributesOfTheOrg,
  attributeOptionId,
}: {
  allAttributesOfTheOrg: FullAttribute[];
  attributeOptionId: AttributeOptionId;
}) {
  return allAttributesOfTheOrg.find((attribute) =>
    attribute.options.some((option) => option.id === attributeOptionId)
  );
}

function oldGetAttributeOptionFromAttributeOption({
  allAttributesOfTheOrg,
  attributeOptionId,
}: {
  allAttributesOfTheOrg: FullAttribute[];
  attributeOptionId: AttributeOptionId;
}) {
  const matchingOption = allAttributesOfTheOrg.reduce(
    (found, attribute) => {
      if (found) return found;
      return attribute.options.find((option) => option.id === attributeOptionId) || null;
    },
    null as null | FullAttribute["options"][number]
  );
  return matchingOption;
}

// ============================================================================
// NEW IMPLEMENTATION (O(1) - Map lookups)
// ============================================================================

function buildAttributeLookupMaps(attributesOfTheOrg: FullAttribute[]) {
  const optionIdToAttribute = new Map<AttributeOptionId, FullAttribute>();
  const optionIdToOption = new Map<AttributeOptionId, FullAttribute["options"][number]>();

  for (const attribute of attributesOfTheOrg) {
    for (const option of attribute.options) {
      optionIdToAttribute.set(option.id, attribute);
      optionIdToOption.set(option.id, option);
    }
  }

  return { optionIdToAttribute, optionIdToOption };
}

type AttributeLookupMaps = ReturnType<typeof buildAttributeLookupMaps>;

function newGetAttributeFromAttributeOption({
  lookupMaps,
  attributeOptionId,
}: {
  lookupMaps: AttributeLookupMaps;
  attributeOptionId: AttributeOptionId;
}) {
  return lookupMaps.optionIdToAttribute.get(attributeOptionId);
}

function newGetAttributeOptionFromAttributeOption({
  lookupMaps,
  attributeOptionId,
}: {
  lookupMaps: AttributeLookupMaps;
  attributeOptionId: AttributeOptionId;
}) {
  return lookupMaps.optionIdToOption.get(attributeOptionId);
}

// ============================================================================
// TEST DATA GENERATION
// ============================================================================

function generateTestData(numAttributes: number, optionsPerAttribute: number): FullAttribute[] {
  const attributes: FullAttribute[] = [];

  for (let i = 0; i < numAttributes; i++) {
    const options: FullAttribute["options"] = [];
    for (let j = 0; j < optionsPerAttribute; j++) {
      options.push({
        id: `attr-${i}-opt-${j}`,
        value: `Option ${j}`,
        slug: `option-${j}`,
        isGroup: false,
        contains: [],
      });
    }

    attributes.push({
      id: `attr-${i}`,
      name: `Attribute ${i}`,
      slug: `attribute-${i}`,
      type: "SINGLE_SELECT" as AttributeType,
      options,
    });
  }

  return attributes;
}

function getRandomOptionIds(attributes: FullAttribute[], count: number): string[] {
  const allOptionIds: string[] = [];
  for (const attr of attributes) {
    for (const opt of attr.options) {
      allOptionIds.push(opt.id);
    }
  }

  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(allOptionIds[Math.floor(Math.random() * allOptionIds.length)]);
  }
  return result;
}

// ============================================================================
// BENCHMARK RUNNER
// ============================================================================

interface BenchmarkResult {
  scenario: string;
  numAttributes: number;
  optionsPerAttribute: number;
  totalOptions: number;
  numLookups: number;
  oldTimeMs: number;
  newTimeMs: number;
  speedup: string;
}

function runBenchmark(
  numAttributes: number,
  optionsPerAttribute: number,
  numLookups: number
): BenchmarkResult {
  const attributes = generateTestData(numAttributes, optionsPerAttribute);
  const totalOptions = numAttributes * optionsPerAttribute;
  const optionIdsToLookup = getRandomOptionIds(attributes, numLookups);

  // Warm up
  for (let i = 0; i < 100; i++) {
    oldGetAttributeFromAttributeOption({
      allAttributesOfTheOrg: attributes,
      attributeOptionId: optionIdsToLookup[0],
    });
  }

  // Benchmark OLD implementation
  const oldStart = performance.now();
  for (const optionId of optionIdsToLookup) {
    oldGetAttributeFromAttributeOption({
      allAttributesOfTheOrg: attributes,
      attributeOptionId: optionId,
    });
    oldGetAttributeOptionFromAttributeOption({
      allAttributesOfTheOrg: attributes,
      attributeOptionId: optionId,
    });
  }
  const oldEnd = performance.now();
  const oldTimeMs = oldEnd - oldStart;

  // Benchmark NEW implementation (including map building time)
  const newStart = performance.now();
  const lookupMaps = buildAttributeLookupMaps(attributes);
  for (const optionId of optionIdsToLookup) {
    newGetAttributeFromAttributeOption({
      lookupMaps,
      attributeOptionId: optionId,
    });
    newGetAttributeOptionFromAttributeOption({
      lookupMaps,
      attributeOptionId: optionId,
    });
  }
  const newEnd = performance.now();
  const newTimeMs = newEnd - newStart;

  const speedup = oldTimeMs / newTimeMs;

  return {
    scenario: `${numAttributes} attrs x ${optionsPerAttribute} opts`,
    numAttributes,
    optionsPerAttribute,
    totalOptions,
    numLookups,
    oldTimeMs: Math.round(oldTimeMs * 100) / 100,
    newTimeMs: Math.round(newTimeMs * 100) / 100,
    speedup: `${speedup.toFixed(1)}x`,
  };
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  console.log("=".repeat(80));
  console.log("ATTRIBUTE ROUTING LOOKUP BENCHMARK");
  console.log("Comparing O(n*m) array scans vs O(1) Map lookups");
  console.log("=".repeat(80));
  console.log();

  const scenarios = [
    // Small scale (typical small team)
    { numAttributes: 5, optionsPerAttribute: 10, numLookups: 100 },
    // Medium scale (typical organization)
    { numAttributes: 20, optionsPerAttribute: 20, numLookups: 500 },
    // Real-world enterprise scenario (14 attributes across ~6,530 options total)
    { numAttributes: 14, optionsPerAttribute: 466, numLookups: 1000 },
    // Large scale (enterprise)
    { numAttributes: 50, optionsPerAttribute: 50, numLookups: 1000 },
    // Very large scale (large enterprise with many attributes)
    { numAttributes: 100, optionsPerAttribute: 100, numLookups: 2000 },
    // Stress test
    { numAttributes: 200, optionsPerAttribute: 100, numLookups: 5000 },
  ];

  const results: BenchmarkResult[] = [];

  for (const scenario of scenarios) {
    const result = runBenchmark(scenario.numAttributes, scenario.optionsPerAttribute, scenario.numLookups);
    results.push(result);
  }

  // Print results table
  console.log("RESULTS:");
  console.log("-".repeat(100));
  console.log("| Scenario                    | Total Options | Lookups | Old (ms) | New (ms) | Speedup |");
  console.log("|-----------------------------|--------------:|--------:|---------:|---------:|--------:|");

  for (const r of results) {
    console.log(
      `| ${r.scenario.padEnd(27)} | ${String(r.totalOptions).padStart(12)} | ${String(r.numLookups).padStart(7)} | ${String(r.oldTimeMs).padStart(8)} | ${String(r.newTimeMs).padStart(8)} | ${r.speedup.padStart(7)} |`
    );
  }

  console.log("-".repeat(100));
  console.log();

  // Summary
  const avgSpeedup = results.reduce((sum, r) => sum + parseFloat(r.speedup), 0) / results.length;
  console.log(`Average speedup: ${avgSpeedup.toFixed(1)}x faster`);
  console.log();

  // Detailed analysis
  console.log("ANALYSIS:");
  console.log("-".repeat(80));
  console.log("The new Map-based implementation provides O(1) lookups instead of O(n*m) scans.");
  console.log("This is especially important for enterprise organizations with:");
  console.log("  - Many attributes (departments, skills, locations, etc.)");
  console.log("  - Many options per attribute");
  console.log("  - Many team members requiring attribute lookups");
  console.log();
  console.log("The speedup increases with scale, making this optimization critical for");
  console.log("large organizations where the old implementation would become a bottleneck.");
}

main();
