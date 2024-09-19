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
        } satisfies InPersonLocation;
      case "link":
        return {
          type: "link",
          link: location.link,
          displayLocationPublicly: location.public,
        } satisfies LinkLocation;
      case "integration":
        const integrationLabel = integrationsMapping[location.integration];
        return { type: integrationLabel } satisfies IntegrationLocation;
      case "phone":
        return {
          type: "userPhone",
          hostPhoneNumber: location.phone,
          displayLocationPublicly: location.public,
        } satisfies UserPhoneLocation;
      default:
        throw new Error(`Unsupported location type '${type}'`);
    }
  });
}

const integrationsMappingSchema = {
  "cal-video": z.literal("integrations:daily"),
};

const InPersonSchema = z.object({
  type: z.literal("inPerson"),
  address: z.string(),
  displayLocationPublicly: z.boolean().default(false),
});

const LinkSchema = z.object({
  type: z.literal("link"),
  link: z.string().url(),
  displayLocationPublicly: z.boolean().default(false),
});

const IntegrationSchema = z.object({
  type: z.union([integrationsMappingSchema["cal-video"], integrationsMappingSchema["cal-video"]]),
});

const UserPhoneSchema = z.object({
  type: z.literal("userPhone"),
  hostPhoneNumber: z.string(),
  displayLocationPublicly: z.boolean().default(false),
});

type InPersonLocation = z.infer<typeof InPersonSchema>;
type LinkLocation = z.infer<typeof LinkSchema>;
type IntegrationLocation = z.infer<typeof IntegrationSchema>;
type UserPhoneLocation = z.infer<typeof UserPhoneSchema>;

const TransformedLocationSchema = z.union([InPersonSchema, LinkSchema, IntegrationSchema, UserPhoneSchema]);
export const TransformedLocationsSchema = z.array(TransformedLocationSchema);
