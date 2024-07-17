type IndividualPlatformPlan = {
  plan: string;
  description: string;
  pricing?: number;
  includes: string[];
};

// if pricing or plans change in future modify this
export const platformPlans: IndividualPlatformPlan[] = [
  {
    plan: "Starter",
    description:
      "Perfect for just getting started with community support and access to hosted platform APIs, Cal.com Atoms (React components) and more.",
    pricing: 99,
    includes: [
      "Up to 100 bookings a month",
      "Community Support",
      "Cal Atoms (React Library)",
      "Platform APIs",
      "Admin APIs",
    ],
  },
  {
    plan: "Essentials",
    description:
      "Your essential package with sophisticated support, hosted platform APIs, Cal.com Atoms (React components) and more.",
    pricing: 299,
    includes: [
      "Up to 500 bookings a month. $0,60 overage beyond",
      "Everything in Starter",
      "Cal Atoms (React Library)",
      "User Management and Analytics",
      "Technical Account Manager and Onboarding Support",
    ],
  },
  {
    plan: "Scale",
    description:
      "The best all-in-one plan to scale your company. Everything you need to provide scheduling for the masses, without breaking things.",
    pricing: 2499,
    includes: [
      "Up to 5000 bookings a month. $0.50 overage beyond",
      "Everything in Essentials",
      "Credential import from other platforms",
      "Compliance Check SOC2, HIPAA",
      "One-on-one developer calls",
      "Help with Credentials Verification (Zoom, Google App Store)",
      "Expedited features and integrations",
      "SLA (99.999% uptime)",
    ],
  },
  {
    plan: "Enterprise",
    description: "Everything in Scale with generous volume discounts beyond 50,000 bookings a month.",
    includes: ["Beyond 50,000 bookings a month", "Everything in Scale", "Up to 50% discount on overages"],
  },
];
