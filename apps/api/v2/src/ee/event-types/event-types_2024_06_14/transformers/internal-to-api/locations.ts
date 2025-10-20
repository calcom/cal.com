import type {
  OutputOrganizersDefaultAppLocation_2024_06_14,
  OutputIntegration_2024_06_14,
  OutputIntegrationLocation_2024_06_14,
  OutputAddressLocation_2024_06_14,
  OutputAttendeeAddressLocation_2024_06_14,
  OutputAttendeeDefinedLocation_2024_06_14,
  OutputAttendeePhoneLocation_2024_06_14,
  OutputLinkLocation_2024_06_14,
  OutputPhoneLocation_2024_06_14,
  OutputUnknownLocation_2024_06_14,
  OutputLocation_2024_06_14,
} from "@calcom/platform-types";
import { prisma } from "@calcom/prisma";

import type { InternalLocation } from "../internal/locations";

// Cache for integration mappings to avoid repeated database queries
let integrationsMappingCache: Record<string, OutputIntegration_2024_06_14> | null = null;
let cacheTimestamp: number | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Fetches integration mappings from the database.
 * Maps internal integration format (e.g., "integrations:daily") to API format (e.g., "cal-video").
 * Results are cached for 5 minutes to improve performance.
 */
async function getIntegrationsMappingFromDB(): Promise<Record<string, OutputIntegration_2024_06_14>> {
  const now = Date.now();

  // Return cached mapping if still valid
  if (integrationsMappingCache && cacheTimestamp && now - cacheTimestamp < CACHE_TTL) {
    return integrationsMappingCache;
  }

  try {
    // Fetch all apps with video/conferencing categories from database
    const apps = await prisma.app.findMany({
      where: {
        enabled: true,
        categories: {
          hasSome: ["conferencing", "video"],
        },
      },
      select: {
        slug: true,
        dirName: true,
      },
    });

    // Build mapping from dirName (internal format) to slug (API format)
    const mapping: Record<string, OutputIntegration_2024_06_14> = {};

    for (const app of apps) {
      // Internal format is "integrations:{dirName}"
      const internalKey = `integrations:${app.dirName}`;
      mapping[internalKey] = app.slug as OutputIntegration_2024_06_14;
    }

    // Update cache
    integrationsMappingCache = mapping;
    cacheTimestamp = now;

    return mapping;
  } catch (error) {
    console.error("Failed to fetch integration mappings from database:", error);

    // Fallback to cached mapping if database query fails
    if (integrationsMappingCache) {
      return integrationsMappingCache;
    }

    // If no cache available, return empty mapping
    // The transformer will mark these as "unknown" locations
    return {};
  }
}

export async function transformLocationsInternalToApi(
  internalLocations: InternalLocation[] | undefined
): Promise<OutputLocation_2024_06_14[]> {
  if (!internalLocations) {
    return [];
  }

  // Fetch integration mappings from database (cached)
  const internalToApiIntegrationsMapping = await getIntegrationsMappingFromDB();

  const apiLocations: OutputLocation_2024_06_14[] = [];

  for (const location of internalLocations) {
    switch (location.type) {
      case "inPerson": {
        if (!location.address) {
          continue;
        }
        const addressLocation: OutputAddressLocation_2024_06_14 = {
          type: "address",
          address: location.address,
          public: location.displayLocationPublicly,
        };
        apiLocations.push(addressLocation);
        break;
      }
      case "attendeeInPerson": {
        const attendeeAddressLocation: OutputAttendeeAddressLocation_2024_06_14 = {
          type: "attendeeAddress",
        };
        apiLocations.push(attendeeAddressLocation);
        break;
      }
      case "link": {
        if (!location.link) {
          continue;
        }
        const linkLocation: OutputLinkLocation_2024_06_14 = {
          type: "link",
          link: location.link,
          public: location.displayLocationPublicly,
        };
        apiLocations.push(linkLocation);
        break;
      }
      case "userPhone": {
        if (!location.hostPhoneNumber) {
          continue;
        }
        const phoneLocation: OutputPhoneLocation_2024_06_14 = {
          type: "phone",
          phone: location.hostPhoneNumber,
          public: location.displayLocationPublicly,
        };
        apiLocations.push(phoneLocation);
        break;
      }
      case "phone": {
        const attendeePhoneLocation: OutputAttendeePhoneLocation_2024_06_14 = {
          type: "attendeePhone",
        };
        apiLocations.push(attendeePhoneLocation);
        break;
      }
      case "somewhereElse": {
        const attendeeDefinedLocation: OutputAttendeeDefinedLocation_2024_06_14 = {
          type: "attendeeDefined",
        };
        apiLocations.push(attendeeDefinedLocation);
        break;
      }
      case "conferencing": {
        const conferencingLocation: OutputOrganizersDefaultAppLocation_2024_06_14 = {
          type: "organizersDefaultApp",
        };
        apiLocations.push(conferencingLocation);
        break;
      }
      default: {
        const integrationType = internalToApiIntegrationsMapping[location.type];
        if (!integrationType) {
          const unknown: OutputUnknownLocation_2024_06_14 = {
            type: "unknown",
            location: JSON.stringify(location),
          };
          apiLocations.push(unknown);
          break;
        }
        const integration: OutputIntegrationLocation_2024_06_14 = {
          type: "integration",
          integration: integrationType,
          link: location.link,
          credentialId: location.credentialId,
        };
        apiLocations.push(integration);
        break;
      }
    }
  }

  return apiLocations;
}
