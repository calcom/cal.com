type IndividualPlatformPlan = {
  plan: string;
  description: string;
  pricing?: number;
  includes: string[];
};

// if pricing or plans change in future modify this
export const platformPlans: IndividualPlatformPlan[] = [
  {
    plan: "Free",
    description:
      "The best plan to dip your toes into scheduling infrastructure. Start immediately with 25 free meetings per month",
    pricing: 0,
    includes: [
      "Up to 25 bookings a month",
      "$0.99 overage beyond",
      "Community Support",
      "Cal Atoms (React Library)",
      "Platform APIs",
    ],
  },
  {
    plan: "Essentials",
    description:
      "Your essential package with sophisticated support, hosted platform APIs, Cal.com Atoms (React components) and more.",
    pricing: 299,
    includes: [
      "Everything in Starter",
      "Up to 500 bookings a month",
      "$0.60 overage beyond",
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
      "Everything in Essentials",
      "Up to 5000 bookings a month",
      "$0.50 overage beyond",
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
    description:
      "Enterprise is perfect for institutions that focus on control, security and everything beyond.",
    includes: [
      "Everything in Scale",
      "No overages",
      "Credential import from other platforms",
      "Compliance Check SOC2, HIPAA",
      "One-on-one developer calls",
      "Help with Credentials Verification (Zoom, Google App Store)",
      "Expedited features and integrations",
      "SLA (99.999% uptime)",
      "Volume Discount",
    ],
  },
];
