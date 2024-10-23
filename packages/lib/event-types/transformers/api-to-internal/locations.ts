import { z } from "zod";

import { type CreateEventTypeInput_2024_06_14, type Integration_2024_06_14 } from "@calcom/platform-types";

const integrationsMapping: Record<Integration_2024_06_14, "integrations:daily"> = {
  "cal-video": "integrations:daily",
};

export function transformLocationsApiToInternal(
  inputLocations: CreateEventTypeInput_2024_06_14["locations"]
) {
  if (!inputLocations) {
    return [];
  }

  return inputLocations.map((location) => {
    const { type } = location;
    switch (type) {
      case "address":
        return {
          type: "inPerson",
          address: location.address,
          displayLocationPublicly: location.public,
        } satisfies OrganizerAddressLocation;
      case "attendeeAddress":
        return { type: "attendeeInPerson" } satisfies AttendeeAddressLocation;
      case "link":
        return {
          type: "link",
          link: location.link,
          displayLocationPublicly: location.public,
        } satisfies OrganizerLinkLocation;
      case "integration":
        const integrationLabel = integrationsMapping[location.integration];
        return { type: integrationLabel } satisfies OrganizerIntegrationLocation;
      case "phone":
        return {
          type: "userPhone",
          hostPhoneNumber: location.phone,
          displayLocationPublicly: location.public,
        } satisfies OrganizerPhoneLocation;
      case "attendeePhone":
        return { type: "phone" } satisfies AttendeePhoneLocation;
      case "attendeeDefined":
        return { type: "somewhereElse" } satisfies AttendeeDefinedLocation;
      default:
        throw new Error(`Unsupported location type '${type}'`);
    }
  });
}

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

type OrganizerAddressLocation = z.infer<typeof OrganizerAddressSchema>;
type OrganizerLinkLocation = z.infer<typeof OrganizerLinkSchema>;
export type OrganizerIntegrationLocation = z.infer<typeof OrganizerIntegrationSchema>;
type OrganizerPhoneLocation = z.infer<typeof OrganizerPhoneSchema>;
type AttendeeAddressLocation = z.infer<typeof AttendeeAddressSchema>;
type AttendeePhoneLocation = z.infer<typeof AttendeePhoneSchema>;
type AttendeeDefinedLocation = z.infer<typeof AttendeeDefinedSchema>;

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
