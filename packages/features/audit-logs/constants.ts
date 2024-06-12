import {
  AuditLogBookingTriggerEvents,
  AuditLogSystemTriggerEvents,
  AuditLogTriggerTargets,
} from "@calcom/prisma/enums";

import type { DefaultAppSettingOptionEntry, GeneralSettingsOption } from "./types";
import { DefaultAppSettingsOptions } from "./types";
import { getHref } from "./utils";

export type AvailableTriggerEventsType = AuditLogBookingTriggerEvents | AuditLogSystemTriggerEvents;

export const availableTriggerEvents: Record<
  string,
  { [key: string]: AvailableTriggerEventsType | AuditLogSystemTriggerEvents }
> = {
  booking: {
    ...AuditLogBookingTriggerEvents,
  },
  apps: {
    ...AuditLogSystemTriggerEvents,
  },
};

export const availableTriggerTargets = {
  booking: {
    label: "Bookings",
    value: AuditLogTriggerTargets.BOOKING,
    key: "booking",
  },
  // teams: {
  //   label: "Teams",>
  //   value: AuditLogTriggerTargets.TEAMS,
  // },
  // webhooks: {
  //   label: "Webhooks",
  //   value: AuditLogTriggerTargets.WEBHOOKS,
  // },
  // api_key: {
  //   label: "API Key",
  //   value: AuditLogTriggerTargets.API_KEYS,
  // },
  apps: {
    label: "Apps",
    value: AuditLogTriggerTargets.APPS,
    key: "apps",
  },
  // routingforms: {
  //   label: "Routing Forms",
  //   value: AuditLogTriggerTargets.ROUTING_FORMS,
  // },
  // workflows: {
  //   label: "Workflows",
  //   value: AuditLogTriggerTargets.WORKFLOWS,
  // },
  // settings: {
  //   label: "Settings",
  //   value: AuditLogTriggerTargets.SETTINGS,
  // },
  // profile: {
  //   label: "User Profile",
  //   value: AuditLogTriggerTargets.USER_PROFILE,
  // },
  // schedule: {
  //   label: "Schedule",
  //   value: AuditLogTriggerTargets.SCHEDULE,
  // },
  // event_types: {
  //   label: "Events",
  //   value: AuditLogTriggerTargets.EVENT_TYPES,
  // },
};

export function getDefaultAppSettings(credentialId: number): DefaultAppSettingOptionEntry[] {
  return [
    {
      key: DefaultAppSettingsOptions.CREDENTIALS,
      name: "Credentials",
      href: "/apps/installed/auditLogs",
      icon: "fingerprint",
    },
    {
      key: DefaultAppSettingsOptions.TRIGGERS,
      name: "Triggers",
      href: getHref("/apps/installed/auditLogs", {
        credentialId: credentialId.toString(),
        activeOption: "triggers",
      }),
      icon: "circle-power",
    },
    {
      key: DefaultAppSettingsOptions.GENERAL,
      name: "General",
      href: getHref("/apps/installed/auditLogs", {
        credentialId: credentialId.toString(),
        activeOption: "general",
      }),
      icon: "wrench",
    },
  ];
}

export function getDefaultGeneralSettingsOptions(): GeneralSettingsOption[] {
  return [
    {
      name: "Reset event toggles",
      description: "Will turn on all event reporting.",
      button: "Reset",
    },
  ];
}
