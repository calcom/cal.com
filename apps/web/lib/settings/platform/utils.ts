import type { IconName } from "@calcom/ui/components/icon";

type IndividualPlatformPlan = {
  plan: string;
  description: string;
  pricing?: number;
  includes: string[];
};

type HelpCardInfo = {
  icon: IconName;
  variant: "basic" | "ProfileCard" | "SidebarCard" | null;
  title: string;
  description: string;
  actionButton: {
    href: string;
    child: string;
  };
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

export const helpCards: HelpCardInfo[] = [
  {
    icon: "rocket",
    title: "Try our Platform Starter Kit",
    description:
      "If you are building a marketplace or platform from scratch, our Platform Starter Kit has everything you need.",
    variant: "basic",
    actionButton: {
      href: "https://experts.cal.com",
      child: "Try the Demo",
    },
  },
  {
    icon: "github",
    title: "Get the Source code",
    description:
      "Our Platform Starter Kit is being used in production by Cal.com itself. You can find the ready-to-rock source code on GitHub.",
    variant: "basic",
    actionButton: {
      href: "https://github.com/calcom/examples",
      child: "GitHub",
    },
  },
  {
    icon: "calendar-check-2",
    title: "Contact us",
    description:
      "Book our engineering team for a 15 minute onboarding call and debug a problem. Please come prepared with questions.",
    variant: "basic",
    actionButton: {
      href: "https://i.cal.com/platform",
      child: "Schedule a call",
    },
  },
  {
    icon: "triangle-alert",
    title: "Report issue",
    description:
      "You can submit a ticket on GitHub or upgrade your plan to receive real-time support with developer conferences",
    variant: "basic",
    actionButton: {
      href: "https://github.com/calcom/cal.com/issues/new?template=platform.md",
      child: "Open Issue",
    },
  },
];
