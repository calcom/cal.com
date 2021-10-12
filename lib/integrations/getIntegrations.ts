import { Prisma } from "@prisma/client";

import { validJson } from "@lib/jsonUtils";

const credentialData = Prisma.validator<Prisma.CredentialArgs>()({
  select: { id: true, type: true, key: true },
});

type CredentialData = Prisma.CredentialGetPayload<typeof credentialData>;

export const ALL_INTEGRATIONS = [
  {
    installed: !!(process.env.GOOGLE_API_CREDENTIALS && validJson(process.env.GOOGLE_API_CREDENTIALS)),
    type: "google_calendar",
    title: "Google Calendar",
    imageSrc: "integrations/google-calendar.svg",
    description: "For personal and business calendars",
    variant: "calendar",
  },
  {
    installed: !!(process.env.MS_GRAPH_CLIENT_ID && process.env.MS_GRAPH_CLIENT_SECRET),
    type: "office365_calendar",
    title: "Office 365 / Outlook.com Calendar",
    imageSrc: "integrations/outlook.svg",
    description: "For personal and business calendars",
    variant: "calendar",
  },
  {
    installed: !!(process.env.ZOOM_CLIENT_ID && process.env.ZOOM_CLIENT_SECRET),
    type: "zoom_video",
    title: "Zoom",
    imageSrc: "integrations/zoom.svg",
    description: "Video Conferencing",
    variant: "conferencing",
  },
  {
    installed: true,
    type: "caldav_calendar",
    title: "CalDav Server",
    imageSrc: "integrations/caldav.svg",
    description: "For personal and business calendars",
    variant: "calendar",
  },
  {
    installed: true,
    type: "apple_calendar",
    title: "Apple Calendar",
    imageSrc: "integrations/apple-calendar.svg",
    description: "For personal and business calendars",
    variant: "calendar",
  },
  {
    installed: !!(
      process.env.STRIPE_CLIENT_ID &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY &&
      process.env.STRIPE_PRIVATE_KEY
    ),
    type: "stripe_payment",
    title: "Stripe",
    imageSrc: "integrations/stripe.svg",
    description: "Receive payments",
    variant: "payment",
  },
] as const;
function getIntegrations(credentials: CredentialData[]) {
  const integrations = ALL_INTEGRATIONS.map((integration) => ({
    ...integration,
    /**
     * @deprecated use `credentials.
     */
    credential: credentials.find((credential) => credential.type === integration.type) || null,
    credentials: credentials.filter((credential) => credential.type === integration.type) || null,
  }));

  return integrations;
}

export type IntegraionMeta = ReturnType<typeof getIntegrations>;

export function hasIntegration(integrations: ReturnType<typeof getIntegrations>, type: string): boolean {
  return !!integrations.find((i) => i.type === type && !!i.installed && !!i.credential);
}

export default getIntegrations;
