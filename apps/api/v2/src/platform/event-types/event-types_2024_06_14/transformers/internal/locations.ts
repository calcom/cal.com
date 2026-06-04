import { z } from "zod";

const integrationsApiAvailable = {
  "cal-video": z.literal("integrations:daily"),
  "google-meet": z.literal("integrations:google:meet"),
  zoom: z.literal("integrations:zoom"),
  "office365-video": z.literal("integrations:office365_video"),
};

// note(Lauris): these are read only aka they exist in database and are to be returned by a READ operation
const integrationsApiUnavailable = {
  zoom: z.literal("integrations:zoom"),
  "whereby-video": z.literal("integrations:whereby_video"),
  "whatsapp-video": z.literal("integrations:whatsapp_video"),
  "webex-video": z.literal("integrations:webex_video"),
  "telegram-video": z.literal("integrations:telegram_video"),
  tandem: z.literal("integrations:tandem"),
  "sylaps-video": z.literal("integrations:sylaps_video"),
  "skype-video": z.literal("integrations:skype_video"),
  "sirius-video": z.literal("integrations:sirius_video_video"),
  "signal-video": z.literal("integrations:signal_video"),
  "shimmer-video": z.literal("integrations:shimmer_video"),
  "salesroom-video": z.literal("integrations:salesroom_video"),
  "roam-video": z.literal("integrations:roam_video"),
  "riverside-video": z.literal("integrations:riverside_video"),
  "ping-video": z.literal("integrations:ping_video"),
  "office365-video": z.literal("integrations:office365_video"),
  "mirotalk-video": z.literal("integrations:mirotalk_video"),
  jitsi: z.literal("integrations:jitsi"),
  "jelly-video": z.literal("integrations:jelly_video"),
  "jelly-conferencing": z.literal("integrations:jelly_conferencing"),
  huddle: z.literal("integrations:huddle01"),
  "facetime-video": z.literal("integrations:facetime_video"),
  "element-call-video": z.literal("integrations:element-call_video"),
  "eightxeight-video": z.literal("integrations:eightxeight_video"),
  "discord-video": z.literal("integrations:discord_video"),
  "demodesk-video": z.literal("integrations:demodesk_video"),
  "campfire-video": z.literal("integrations:campfire_video"),
};

export const integrationsApiToInternalMappingSchema = {
  ...integrationsApiAvailable,
  ...integrationsApiUnavailable,
};

const OrganizerIntegrationSchema = z.object({
  type: z.union([
    integrationsApiToInternalMappingSchema["cal-video"],
    integrationsApiToInternalMappingSchema["google-meet"],
    integrationsApiToInternalMappingSchema["zoom"],
    integrationsApiToInternalMappingSchema["whereby-video"],
    integrationsApiToInternalMappingSchema["whatsapp-video"],
    integrationsApiToInternalMappingSchema["webex-video"],
    integrationsApiToInternalMappingSchema["telegram-video"],
    integrationsApiToInternalMappingSchema["tandem"],
    integrationsApiToInternalMappingSchema["sylaps-video"],
    integrationsApiToInternalMappingSchema["skype-video"],
    integrationsApiToInternalMappingSchema["sirius-video"],
    integrationsApiToInternalMappingSchema["signal-video"],
    integrationsApiToInternalMappingSchema["shimmer-video"],
    integrationsApiToInternalMappingSchema["salesroom-video"],
    integrationsApiToInternalMappingSchema["roam-video"],
    integrationsApiToInternalMappingSchema["riverside-video"],
    integrationsApiToInternalMappingSchema["ping-video"],
    integrationsApiToInternalMappingSchema["office365-video"],
    integrationsApiToInternalMappingSchema["mirotalk-video"],
    integrationsApiToInternalMappingSchema["jitsi"],
    integrationsApiToInternalMappingSchema["jelly-video"],
    integrationsApiToInternalMappingSchema["jelly-conferencing"],
    integrationsApiToInternalMappingSchema["huddle"],
    integrationsApiToInternalMappingSchema["facetime-video"],
    integrationsApiToInternalMappingSchema["element-call-video"],
    integrationsApiToInternalMappingSchema["eightxeight-video"],
    integrationsApiToInternalMappingSchema["discord-video"],
    integrationsApiToInternalMappingSchema["demodesk-video"],
    integrationsApiToInternalMappingSchema["campfire-video"],
  ]),
  link: z.string().url().optional(),
  credentialId: z.number().optional(),
});

const OrganizerAddressSchema = z.object({
  type: z.literal("inPerson"),
  address: z.string(),
  displayLocationPublicly: z.boolean().default(false),
});

const OrganizerLinkSchema = z.object({
  type: z.literal("link"),
  link: z.string().url(),
  displayLocationPublicly: z.boolean().default(false),
});

const OrganizerPhoneSchema = z.object({
  type: z.literal("userPhone"),
  hostPhoneNumber: z.string(),
  displayLocationPublicly: z.boolean().default(false),
});

const OrganizerConferencingSchema = z.object({
  type: z.literal("conferencing"),
});

const AttendeeAddressSchema = z.object({
  type: z.literal("attendeeInPerson"),
});

const AttendeePhoneSchema = z.object({
  type: z.literal("phone"),
});

const AttendeeDefinedSchema = z.object({
  type: z.literal("somewhereElse"),
});

export type OrganizerAddressLocation = z.infer<typeof OrganizerAddressSchema>;
export type OrganizerLinkLocation = z.infer<typeof OrganizerLinkSchema>;
export type OrganizerIntegrationLocation = z.infer<typeof OrganizerIntegrationSchema>;
export type OrganizerPhoneLocation = z.infer<typeof OrganizerPhoneSchema>;
export type OrganizerConferencingSchema = z.infer<typeof OrganizerConferencingSchema>;
export type AttendeeAddressLocation = z.infer<typeof AttendeeAddressSchema>;
export type AttendeePhoneLocation = z.infer<typeof AttendeePhoneSchema>;
export type AttendeeDefinedLocation = z.infer<typeof AttendeeDefinedSchema>;

export const InternalLocationSchema = z.union([
  OrganizerAddressSchema,
  OrganizerLinkSchema,
  OrganizerIntegrationSchema,
  OrganizerPhoneSchema,
  OrganizerConferencingSchema,
  AttendeeAddressSchema,
  AttendeePhoneSchema,
  AttendeeDefinedSchema,
]);
export type InternalLocation = z.infer<typeof InternalLocationSchema>;

export const InternalLocationsSchema = z.array(InternalLocationSchema);
