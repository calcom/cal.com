import type { IconName } from "@calid/features/ui/components/icon";

export type Feature = {
  icon: IconName;
  title: string;
  description?: string;
  pageSlug?: string;
  isNew?: boolean;
  isComingSoon?: boolean;
};

export const newFeatureCardContent: Feature[] = [
  {
    icon: "workflow",
    title: "Worflow Status",
    description: "See the status of your bookings workflows in real-time.",
    isNew: true,
  },
  {
    icon: "credit-card",
    title: "Multi-Seat Booking",
    description: "Collect payment from multiple bookers for a single event.",
    isNew: true,
  },
  {
    icon: "calendar-days",
    title: "Unified Calendar View",
    description: "View bookings across all your calendars in a unified calendar view.",
    isComingSoon: true,
  },
];

export const featureCardContent: Feature[] = [
  {
    icon: "download",
    title: "Import from Calendly",
    description: "Import your Calendly events and bookings to Cal ID.",
    pageSlug: "/settings/others/import",
  },
  {
    icon: "paintbrush",
    title: "Custom Branding",
    description: "Customize your booking page with your own branding.",
    pageSlug: "/settings/my-account/custom-branding",
  },
  {
    icon: "paperclip",
    title: "Attachments",
    description: "Allow your bookers to upload attachments to their bookings.",
  },
  {
    icon: "shield",
    title: "Recaptcha Protection",
    description: "Protect your booking page from spam and abuse.",
  },
  {
    icon: "users",
    title: "Internal Team Booking",
    description: "Schedule a meeting with your internal team members.",
    pageSlug: "/availability?type=team",
  },
];
