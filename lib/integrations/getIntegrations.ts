import { Prisma } from "@prisma/client";
import _ from "lodash";

/**
 *  We can't use aliases in playwright tests (yet)
 * https://github.com/microsoft/playwright/issues/7121
 */
import { validJson } from "../../lib/jsonUtils";

const credentialData = Prisma.validator<Prisma.CredentialArgs>()({
  select: { id: true, type: true },
});

type CredentialData = Prisma.CredentialGetPayload<typeof credentialData>;

export type Integration = {
  installed: boolean;
  type:
    | "google_calendar"
    | "office365_calendar"
    | "zoom_video"
    | "daily_video"
    | "caldav_calendar"
    | "apple_calendar"
    | "stripe_payment";
  title: string;
  imageSrc: string;
  description: string;
  variant: "calendar" | "conferencing" | "payment";
};

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
    installed: !!process.env.DAILY_API_KEY,
    type: "daily_video",
    title: "Daily.co Video",
    imageSrc: "integrations/daily.svg",
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
    description: "Collect payments",
    variant: "payment",
  },
] as Integration[];

function getIntegrations(userCredentials: CredentialData[]) {
  const integrations = ALL_INTEGRATIONS.map((integration) => {
    const credentials = userCredentials
      .filter((credential) => credential.type === integration.type)
      .map((credential) => _.pick(credential, ["id", "type"])); // ensure we don't leak `key` to frontend

    const credential: typeof credentials[number] | null = credentials[0] || null;
    return {
      ...integration,
      /**
       * @deprecated use `credentials`
       */
      credential,
      credentials,
    };
  });

  return integrations;
}

export type IntegrationMeta = ReturnType<typeof getIntegrations>;

export function hasIntegration(integrations: IntegrationMeta, type: string): boolean {
  return !!integrations.find(
    (i) => i.type === type && !!i.installed && (type === "daily_video" || i.credentials.length > 0)
  );
}
export function hasIntegrationInstalled(type: Integration["type"]): boolean {
  return ALL_INTEGRATIONS.some((i) => i.type === type && !!i.installed);
}

export default getIntegrations;
