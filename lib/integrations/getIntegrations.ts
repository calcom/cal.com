import { Prisma } from "@prisma/client";

import { validJson } from "@lib/jsonUtils";

const credentialData = Prisma.validator<Prisma.CredentialArgs>()({
  select: { id: true, type: true, key: true },
});

type CredentialData = Prisma.CredentialGetPayload<typeof credentialData>;

function getIntegrations(credentials: CredentialData[]) {
  const integrations = [
    {
      installed: !!(process.env.GOOGLE_API_CREDENTIALS && validJson(process.env.GOOGLE_API_CREDENTIALS)),
      credential: credentials.find((integration) => integration.type === "google_calendar") || null,
      type: "google_calendar",
      title: "Google Calendar",
      imageSrc: "integrations/google-calendar.svg",
      description: "For personal and business calendars",
    },
    {
      installed: !!(process.env.MS_GRAPH_CLIENT_ID && process.env.MS_GRAPH_CLIENT_SECRET),
      type: "office365_calendar",
      credential: credentials.find((integration) => integration.type === "office365_calendar") || null,
      title: "Office 365 / Outlook.com Calendar",
      imageSrc: "integrations/outlook.svg",
      description: "For personal and business calendars",
    },
    {
      installed: !!(process.env.ZOOM_CLIENT_ID && process.env.ZOOM_CLIENT_SECRET),
      type: "zoom_video",
      credential: credentials.find((integration) => integration.type === "zoom_video") || null,
      title: "Zoom",
      imageSrc: "integrations/zoom.svg",
      description: "Video Conferencing",
    },
    {
      installed: true,
      type: "caldav_calendar",
      credential: credentials.find((integration) => integration.type === "caldav_calendar") || null,
      title: "CalDav Server",
      imageSrc: "integrations/caldav.svg",
      description: "For personal and business calendars",
    },
    {
      installed: true,
      type: "apple_calendar",
      credential: credentials.find((integration) => integration.type === "apple_calendar") || null,
      title: "Apple Calendar",
      imageSrc: "integrations/apple-calendar.svg",
      description: "For personal and business calendars",
    },
    {
      installed: !!(
        process.env.STRIPE_CLIENT_ID &&
        process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY &&
        process.env.STRIPE_PRIVATE_KEY
      ),
      type: "stripe_payment",
      credential: credentials.find((integration) => integration.type === "stripe_payment") || null,
      title: "Stripe",
      imageSrc: "integrations/stripe.svg",
      description: "Receive payments",
    },
  ];

  return integrations;
}

export function hasIntegration(integrations: ReturnType<typeof getIntegrations>, type: string): boolean {
  return !!integrations.find((i) => i.type === type && !!i.installed && !!i.credential);
}

export default getIntegrations;
