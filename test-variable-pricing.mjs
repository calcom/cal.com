#!/usr/bin/env node

/**
 * Manual test script to verify variable pricing implementation
 * This script tests the core functionality without requiring UI or API
 */

import { calculateVariablePrice, createPricingContext, formatPrice } from "../packages/lib/pricing/calculator.js";
import { createPricingRule, createPriceModifier } from "../packages/lib/pricing/utils.js";

console.log("🚀 Testing Variable Pricing Implementation\n");

// Test 1: Basic functionality with duration-based pricing
console.log("1. Testing duration-based pricing:");
const durationConfig = {
  enabled: true,
  basePrice: 5000, // $50 base price
  currency: "usd",
  rules: [
    createPricingRule("duration", {
      description: "Long session rate (2+ hours)",
      priority: 10,
      condition: { minDuration: 120 },
      price: 15000, // $150 for 2+ hours
    }),
  ],
};

const longSessionContext = createPricingContext(
  1,
  new Date("2024-01-15T10:00:00"),
  new Date("2024-01-15T12:30:00"), // 2.5 hours
  "UTC"
);

const longSessionResult = calculateVariablePrice(durationConfig, longSessionContext);
console.log(`   Duration: ${longSessionContext.duration} minutes`);
console.log(`   Price: ${formatPrice(longSessionResult.totalPrice, "usd")}`);
console.log(`   Breakdown: ${longSessionResult.breakdown.map(b => `${b.description}: ${formatPrice(b.amount, "usd")}`).join(", ")}\n`);

// Test 2: Weekend surcharge
console.log("2. Testing weekend surcharge:");
const weekendConfig = {
  enabled: true,
  basePrice: 10000, // $100 base price
  currency: "usd",
  rules: [
    createPricingRule("dayOfWeek", {
      description: "Weekend premium",
      priority: 5,
      condition: { days: ["saturday", "sunday"] },
      priceModifier: createPriceModifier("surcharge", 0, 25), // 25% surcharge
    }),
  ],
};

const weekendContext = createPricingContext(
  1,
  new Date("2024-01-13T14:00:00"), // Saturday
  new Date("2024-01-13T15:00:00"),
  "UTC"
);

const weekendResult = calculateVariablePrice(weekendConfig, weekendContext);
console.log(`   Day: ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][weekendContext.dayOfWeek]}`);
console.log(`   Price: ${formatPrice(weekendResult.totalPrice, "usd")}`);
console.log(`   Breakdown: ${weekendResult.breakdown.map(b => `${b.description}: ${formatPrice(b.amount, "usd")}`).join(", ")}\n`);

// Test 3: Time of day discount
console.log("3. Testing early morning discount:");
const timeConfig = {
  enabled: true,
  basePrice: 8000, // $80 base price
  currency: "usd",
  rules: [
    createPricingRule("timeOfDay", {
      description: "Early bird special",
      priority: 5,
      condition: { startTime: "06:00", endTime: "09:00" },
      priceModifier: createPriceModifier("discount", 0, 20), // 20% discount
    }),
  ],
};

const earlyContext = createPricingContext(
  1,
  new Date("2024-01-15T07:00:00"), // 7 AM
  new Date("2024-01-15T08:00:00"),
  "UTC"
);

const earlyResult = calculateVariablePrice(timeConfig, earlyContext);
console.log(`   Time: ${earlyContext.startTime.toISOString()}`);
console.log(`   Price: ${formatPrice(earlyResult.totalPrice, "usd")}`);
console.log(`   Breakdown: ${earlyResult.breakdown.map(b => `${b.description}: ${formatPrice(b.amount, "usd")}`).join(", ")}\n`);

// Test 4: Complex scenario with multiple rules
console.log("4. Testing complex scenario (multiple rules):");
const complexConfig = {
  enabled: true,
  basePrice: 5000, // $50 base price
  currency: "usd",
  rules: [
    createPricingRule("duration", {
      description: "Extended session (2+ hours)",
      priority: 10,
      condition: { minDuration: 120 },
      price: 15000, // $150 flat rate
    }),
    createPricingRule("dayOfWeek", {
      description: "Weekend surcharge",
      priority: 8,
      condition: { days: ["saturday", "sunday"] },
      priceModifier: createPriceModifier("surcharge", 0, 25), // 25% surcharge
    }),
    createPricingRule("timeOfDay", {
      description: "After-hours premium",
      priority: 7,
      condition: { startTime: "20:00", endTime: "06:00" },
      priceModifier: createPriceModifier("surcharge", 2000), // +$20
    }),
  ],
};

const complexContext = createPricingContext(
  1,
  new Date("2024-01-13T21:00:00"), // Saturday 9 PM
  new Date("2024-01-14T00:00:00"), // 3 hours
  "UTC"
);

const complexResult = calculateVariablePrice(complexConfig, complexContext);
console.log(`   Duration: ${complexContext.duration} minutes`);
console.log(`   Day: ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][complexContext.dayOfWeek]}`);
console.log(`   Time: ${complexContext.startTime.toISOString()}`);
console.log(`   Price: ${formatPrice(complexResult.totalPrice, "usd")}`);
console.log(`   Breakdown:`);
complexResult.breakdown.forEach(b => {
  console.log(`     - ${b.description}: ${formatPrice(b.amount, "usd")} (${b.type})`);
});

console.log("\n✅ All tests completed successfully!");
