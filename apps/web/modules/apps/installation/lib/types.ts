import type { EventTypeAppSettingsComponentProps, EventTypeModel } from "@calcom/app-store/types";
import type { LocationFormValues } from "@calcom/features/eventtypes/lib/types";
import type { AppMeta } from "@calcom/types/App";

import type { PersonalAccountProps, TeamsProp } from "@components/apps/installation/AccountsStepCard";

import type { STEPS } from "./steps";

export type TEventType = EventTypeAppSettingsComponentProps["eventType"] &
  Pick<
    EventTypeModel,
    "metadata" | "schedulingType" | "slug" | "requiresConfirmation" | "position" | "destinationCalendar"
  > & {
    selected: boolean;
    locations: LocationFormValues["locations"];
    bookingFields?: LocationFormValues["bookingFields"];
  };

export type TEventTypesForm = {
  eventTypes: TEventType[];
};

export type StepType = (typeof STEPS)[number];

export type OnboardingPageProps = {
  appMetadata: AppMeta;
  step: StepType;
  teams?: TeamsProp;
  personalAccount: PersonalAccountProps;
  eventTypes?: TEventType[];
  userName: string;
  credentialId?: number;
  showEventTypesStep: boolean;
  isConferencing: boolean;
  installableOnTeams: boolean;
};
