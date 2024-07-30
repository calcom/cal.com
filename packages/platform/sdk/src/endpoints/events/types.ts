import { z } from "zod";

const GetPublicEventSchema = z.object({
  username: z.string().transform((s) => s.toLowerCase()),
  eventSlug: z.string(),
  isTeamEvent: z.boolean().optional(),
  org: z.string().optional(),
});

export type GetPublicEventArgs = z.infer<typeof GetPublicEventSchema>;

type User = {
  // todo expand
};

type TeamParent = {
  slug: string;
  name: string;
};

type Team = {
  parentId: string;
  metadata: Record<string, unknown>;
  brandColor: string;
  darkBrandColor: string;
  slug: string;
  name: string;
  logo: string;
  theme: string;
  parent: TeamParent;
};

type WorkflowStep = {
  // todo expand
};

type Workflow = {
  steps: WorkflowStep[];
};

export type Event = {
  id: string;
  title: string;
  description: string;
  eventName: string;
  slug: string;
  isInstantEvent: boolean;
  instantMeetingExpiryTimeOffsetInSeconds: number;
  aiPhoneCallConfig: {
    eventTypeId: number;
    enabled: boolean;
    generalPrompt: string;
    beginMessage: string | null;
    yourPhoneNumber: string;
    numberToCall: string;
    guestName?: string;
    guestEmail?: string;
    guestCompany?: string;
    templateType: string;
    schedulerName?: string;
  };
  schedulingType: string;
  length: number;
  locations: string[]; // Define more specifically if possible
  customInputs: unknown; // Define more specifically if possible
  disableGuests: boolean;
  lockTimeZoneToggleOnBookingPage: boolean;
  requiresConfirmation: boolean;
  requiresBookerEmailVerification: boolean;
  recurringEvent: boolean;
  price: number;
  currency: string;
  seatsPerTimeSlot: number;
  seatsShowAvailabilityCount: boolean;
  bookingFields: unknown; // Define more specifically if possible
  team: Team;
  successRedirectUrl: string;
  workflows: Workflow[];
  hosts: {
    user: User;
  }[];
  owner: User;
  hidden: boolean;
  assignAllTeamMembers: boolean;
};
