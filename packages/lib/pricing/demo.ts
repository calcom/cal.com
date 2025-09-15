#!/usr/bin/env node

/**
 * Demo script for Variable Pricing Feature
 * This demonstrates the core pricing calculation engine capabilities
 */
import { calculateVariablePrice, createPricingContext, formatPrice } from "./calculator";
import type { VariablePricingConfig } from "./types";
import { createPricingRule, createPriceModifier } from "./utils";

// Demo configuration with various pricing rules
const demoConfig: VariablePricingConfig = {
  enabled: true,
  basePrice: 5000, // $50.00 base price
  currency: "usd",
  rules: [
    // Duration-based absolute pricing for long sessions
    createPricingRule("duration", {
      id: "long-session-rate",
      description: "Extended session rate (2+ hours)",
      priority: 10,
      condition: {
        minDuration: 120, // 2 hours or more
      },
      price: 15000, // $150 flat rate for long sessions
    }),

    // Weekend surcharge
    createPricingRule("dayOfWeek", {
      id: "weekend-surcharge",
      description: "Weekend premium",
      priority: 8,
      condition: {
        days: ["saturday", "sunday"],
      },
      priceModifier: createPriceModifier("surcharge", 0, 25), // 25% weekend surcharge
    }),

    // Early morning discount
    createPricingRule("timeOfDay", {
      id: "early-bird-discount",
      description: "Early bird special",
      priority: 5,
      condition: {
        startTime: "06:00",
        endTime: "09:00",
      },
      priceModifier: createPriceModifier("discount", 0, 20), // 20% early morning discount
    }),

    // Late night surcharge
    createPricingRule("timeOfDay", {
      id: "late-night-surcharge",
      description: "After-hours premium",
      priority: 7,
      condition: {
        startTime: "20:00",
        endTime: "06:00",
      },
      priceModifier: createPriceModifier("surcharge", 2000), // $20 late night fee
    }),

    // Weekday lunch time discount
    createPricingRule("timeOfDay", {
      id: "lunch-discount",
      description: "Lunch hour discount",
      priority: 3,
      condition: {
        startTime: "12:00",
        endTime: "14:00",
      },
      priceModifier: createPriceModifier("discount", 1000), // $10 off during lunch
    }),
  ],
};

// Demo scenarios
const scenarios = [
  {
    name: "Standard Weekday Meeting",
    startTime: new Date("2024-02-15T10:00:00"), // Thursday 10 AM
    endTime: new Date("2024-02-15T11:00:00"), // 1 hour
  },
  {
    name: "Weekend Session",
    startTime: new Date("2024-02-17T14:00:00"), // Saturday 2 PM
    endTime: new Date("2024-02-17T15:00:00"), // 1 hour
  },
  {
    name: "Early Bird Weekday",
    startTime: new Date("2024-02-16T07:30:00"), // Friday 7:30 AM
    endTime: new Date("2024-02-16T08:30:00"), // 1 hour
  },
  {
    name: "Late Night Weekend",
    startTime: new Date("2024-02-18T22:00:00"), // Sunday 10 PM
    endTime: new Date("2024-02-18T23:00:00"), // 1 hour
  },
  {
    name: "Long Weekend Session",
    startTime: new Date("2024-02-17T14:00:00"), // Saturday 2 PM
    endTime: new Date("2024-02-17T17:00:00"), // 3 hours
  },
  {
    name: "Lunch Hour Meeting",
    startTime: new Date("2024-02-15T12:30:00"), // Thursday 12:30 PM
    endTime: new Date("2024-02-15T13:30:00"), // 1 hour
  },
];

console.log("🎯 Cal.com Variable Pricing Engine Demo\n");
console.log("=".repeat(60));
console.log(`Base Price: ${formatPrice(demoConfig.basePrice, demoConfig.currency)}`);
console.log(`Active Rules: ${demoConfig.rules.length}`);
console.log("=".repeat(60));

scenarios.forEach((scenario, index) => {
  const context = createPricingContext(
    1, // eventTypeId
    scenario.startTime,
    scenario.endTime,
    "America/New_York"
  );

  const result = calculateVariablePrice(demoConfig, context);

  console.log(`\n${index + 1}. ${scenario.name}`);
  console.log(
    `   📅 ${scenario.startTime.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`
  );
  console.log(`   ⏱️  Duration: ${context.duration} minutes`);

  // Show price breakdown
  result.breakdown.forEach((item, _i) => {
    const symbol = item.type === "base" ? "💰" : item.type === "surcharge" ? "📈" : "📉";
    console.log(`   ${symbol} ${item.description}: ${formatPrice(Math.abs(item.amount), result.currency)}`);
  });

  console.log(`   💵 Total: ${formatPrice(result.totalPrice, result.currency)}`);

  // Calculate savings/surcharge from base
  const difference = result.totalPrice - demoConfig.basePrice;
  if (difference > 0) {
    console.log(`   📊 +${formatPrice(difference, result.currency)} from base price`);
  } else if (difference < 0) {
    console.log(`   📊 ${formatPrice(difference, result.currency)} savings from base price`);
  }
});

console.log(`\n${"=".repeat(60)}`);
console.log("Demo completed! 🎉");
console.log("\nKey Features Demonstrated:");
console.log("✅ Duration-based absolute pricing");
console.log("✅ Day-of-week surcharges");
console.log("✅ Time-based discounts and surcharges");
console.log("✅ Multiple rule combinations");
console.log("✅ Priority-based rule application");
console.log("✅ Comprehensive price breakdown");
console.log("✅ Multi-currency support");
