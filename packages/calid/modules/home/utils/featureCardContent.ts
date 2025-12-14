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
    icon: "message-circle",
    title: "WhatsApp Business",
    description: "Connect your WhatsApp Business to message bookers using your own templates.",
    pageSlug: "/apps/whatsapp-business",
    isNew: true,
  },
  {
    icon: "linkedin",
    title: "Social Profiles on Public Page",
    description: "Add your social profiles to show on your public page.",
    pageSlug: "/settings/my-account/appearance",
    isNew: true,
  },
  {
    icon: "credit-card",
    title: "Multi-Seat Booking",
    description: "Collect payment from multiple bookers for a single event.",
    isNew: true,
  },
  {
    icon: "paperclip",
    title: "Attachments",
    description: "Allow your bookers to upload attachments to their bookings.",
    isComingSoon: true,
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
    icon: "credit-card",
    title: "Razorpay Integration",
    description: "Collect payments from your bookers using Razorpay.",
    pageSlug: "/apps/razorpay",
  },
  {
    icon: "paintbrush",
    title: "Custom Branding",
    description: "Customize your booking page with your own branding.",
    pageSlug: "/settings/my-account/appearance",
  },
  {
    icon: "wallpaper",
    title: "Public Page Banner",
    description: "Put a custom banner to showcase your brand.",
    pageSlug: "/settings/my-account/profile",
  },
  {
    icon: "download",
    title: "Import from Calendly",
    description: "Import your Calendly events and bookings to Cal ID.",
    pageSlug: "/settings/others/import",
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
