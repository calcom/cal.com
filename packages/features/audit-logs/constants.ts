import { AuditLogBookingTriggerEvents, AuditLogTriggerTargets } from "@calcom/prisma/enums";

import { DefaultAppSettingsOptions, type AppSettingOptionEntry } from "./types";
import { getHref } from "./utils";

export const availableTriggerEvents: { [key: string]: string | any } = {
  booking: {
    ...AuditLogBookingTriggerEvents,
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
  // apps: {
  //   label: "Apps",
  //   value: AuditLogTriggerTargets.APPS,
  // },
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

export function getDefaultAppSettings(credentialId: number): AppSettingOptionEntry[] {
  return [
    {
      key: DefaultAppSettingsOptions.CREDENTIALS,
      name: "Credentials",
      href: "/apps/installed/auditLogs",
      icon: "fingerprint",
    },
    {
      kay: DefaultAppSettingsOptions.TRIGGERS,
      name: "Triggers",
      href: getHref("/apps/installed/auditLogs", {
        credentialId: credentialId.toString(),
        activeOption: "triggers",
      }),
      icon: "circle-power",
    },
  ];
}
