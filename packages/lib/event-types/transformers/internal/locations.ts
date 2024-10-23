import { z } from "zod";

const integrationsMappingSchema = {
  "cal-video": z.literal("integrations:daily"),
};

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

const OrganizerIntegrationSchema = z.object({
  type: z.union([integrationsMappingSchema["cal-video"], integrationsMappingSchema["cal-video"]]),
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
export type AttendeeAddressLocation = z.infer<typeof AttendeeAddressSchema>;
export type AttendeePhoneLocation = z.infer<typeof AttendeePhoneSchema>;
export type AttendeeDefinedLocation = z.infer<typeof AttendeeDefinedSchema>;

const TransformedLocationSchema = z.union([
  OrganizerAddressSchema,
  OrganizerLinkSchema,
  OrganizerIntegrationSchema,
  OrganizerPhoneSchema,
  OrganizerConferencingSchema,
  AttendeeAddressSchema,
  AttendeePhoneSchema,
  AttendeeDefinedSchema,
]);
export const TransformedLocationsSchema = z.array(TransformedLocationSchema);
