import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import {
  CalVideoLocationType,
  getLocationValueForDB,
  type LocationObject,
  OrganizerDefaultConferencingAppType,
} from "@calcom/app-store/locations";
import { getAppFromSlug } from "@calcom/app-store/utils";
import { HostLocationRepository } from "@calcom/features/host/repositories/HostLocationRepository";
import type { PrismaClient } from "@calcom/prisma";
import { userMetadata as userMetadataSchema } from "@calcom/prisma/zod-utils";

type GetOrganizerDefaultConferencingAppLocationParams = {
  organizerMetadata: unknown;
};

type GetOrganizerDefaultConferencingAppLocationResult = {
  /**
   * The conferencing app location type.
   * It starts with 'integrations:' e.g. 'integrations:zoom' and it is defined in the app's config/metadata.ts file
   */
  conferencingAppLocationType: string;
} & (
  | {
      isStaticLinkApp: true;
      staticLink: string;
    }
  | {
      isStaticLinkApp: false;
    }
);

type GetLocationForHostParams = {
  /**
   * The new host's metadata containing their default conferencing app preferences
   */
  hostMetadata: unknown;
  /**
   * The event type's configured locations
   */
  eventTypeLocations: LocationObject[];
  /**
   * Whether this is a managed event type
   */
  isManagedEventType?: boolean;
  /**
   * Whether this is a team event type
   */
  isTeamEventType?: boolean;
};

type GetLocationForHostResult = {
  /**
   * The location string to be stored in the booking
   */
  bookingLocation: string;
} & (
  | {
      requiresActualLink: false;
    }
  | {
      requiresActualLink: true;
      // Credential ID for generating the conferencing link. Set when:
      // 1. The app supports team installation (concurrentMeetings: true)
      // 2. The app is installed at team level (credential has teamId)
      // 3. The event type is a team event that can use team credentials
      conferenceCredentialId: number | null;
    }
);

type GetLocationDetailsFromTypeParams = {
  /**
   * The location type or value to resolve
   * @example "integrations:zoom" - A dynamic location type
   * @example "https://example.com/meeting" - A static link value
   * @example "integrations:daily" - Cal Video location type
   */
  locationType: string;
  /**
   * The event type's configured locations that may contain credential IDs
   */
  eventTypeLocations: LocationObject[];
};

type GetLocationDetailsFromTypeResult = {
  /**
   * The resolved location value for the database
   */
  bookingLocation: string;
  /**
   * The conference credential ID if present in the location configuration
   */
  conferenceCredentialId: number | null;
};

type HostLocation = {
  type: string;
  credentialId: number | null;
  link: string | null;
  address: string | null;
  phoneNumber: string | null;
};

type GetPerHostLocationParams = {
  hostLocation: HostLocation;
  allCredentials: { id: number; type: string }[];
  eventTypeId: number;
  userId: number;
  prismaClient: PrismaClient;
};

type GetPerHostLocationResult = {
  locationBodyString: string;
  organizerDefaultLocationUrl: string | null;
  perHostCredentialId: number | undefined;
};

export class BookingLocationService {
  /**
   * Determines the booking location based on the Organizer's Default Conferencing App.
   *
   * Note that Organizer's Default Conferencing App is applicable only to Team Events. It gets also applicable to Children Managed Event Types(which are technically User Event Types) as well because the location is configured at Parent Managed Event Type(which is a Team Event Type)
   *
   * This function handles two types of conferencing apps:
   * 1. Dynamic link apps (e.g., Google Meet, Zoom) - Generate a new link for each booking
   *    - These apps only have `appSlug` in organizerMetadata
   *    - The location is determined by the app's metadata (e.g., "integrations:google:meet")
   *
   * 2. Static link apps (e.g., Campfire)
   *    - These apps have `appLink`, as well as `appSlug` in organizerMetadata
   *    - The `appLink` is only used for managed or team event types
   *
   * @returns The location configuration or null if no valid conferencing app is found.
   *          Callers should handle the null case with their own fallback logic.
   */
  static getOrganizerDefaultConferencingAppLocation({
    organizerMetadata,
  }: GetOrganizerDefaultConferencingAppLocationParams): GetOrganizerDefaultConferencingAppLocationResult | null {
    // Parse the user metadata to extract conferencing app settings
    const metadataParseResult = userMetadataSchema.safeParse(organizerMetadata);
    const parsedMetadata = metadataParseResult.success ? metadataParseResult.data : undefined;

    if (!parsedMetadata?.defaultConferencingApp?.appSlug) {
      return null;
    }

    // Retrieve the app configuration from the app store
    const app = getAppFromSlug(parsedMetadata.defaultConferencingApp.appSlug);
    // Extract the location type from the app's metadata (e.g., "integrations:zoom")
    const conferencingAppLocationType = app?.appData?.location?.type || null;

    // If the app doesn't have a valid location type, return null
    if (!conferencingAppLocationType) {
      return null;
    }

    if (parsedMetadata.defaultConferencingApp.appLink) {
      return {
        conferencingAppLocationType,
        isStaticLinkApp: true,
        staticLink: parsedMetadata.defaultConferencingApp.appLink,
      };
    }

    return {
      conferencingAppLocationType,
      isStaticLinkApp: false,
    };
  }

  /**
   * Determines the appropriate booking location based on the chosen host
   *
   * Logic:
   * 1. If the event type includes OrganizerDefaultConferencingAppType in its locations,
   *    and the new host has a default conferencing app configured, use that.
   * 2. Otherwise, use the first available location from the event type's configured locations.
   *
   *
   * @returns The location configuration for the new host
   */
  static getLocationForHost({
    hostMetadata,
    eventTypeLocations,
    isManagedEventType = false,
    isTeamEventType = false,
  }: GetLocationForHostParams): GetLocationForHostResult {
    // Check if the event type allows using the organizer's default conferencing app
    const eventAllowsOrganizerDefault = eventTypeLocations.some(
      (location) => location.type === OrganizerDefaultConferencingAppType
    );

    const isOrganizerDefaultAllowed = isTeamEventType || isManagedEventType;

    if (eventAllowsOrganizerDefault && isOrganizerDefaultAllowed) {
      const organizerDefaultLocation = BookingLocationService.getOrganizerDefaultConferencingAppLocation({
        organizerMetadata: hostMetadata,
      });

      if (organizerDefaultLocation) {
        if (organizerDefaultLocation.isStaticLinkApp) {
          return {
            requiresActualLink: false,
            bookingLocation: organizerDefaultLocation.staticLink,
          };
        }

        return {
          requiresActualLink: true,
          conferenceCredentialId: null,
          bookingLocation: organizerDefaultLocation.conferencingAppLocationType,
        };
      }
    }

    // Fallback: Find the first real location (not OrganizerDefaultConferencingAppType)
    const firstRealLocation = eventTypeLocations.find(
      (location) => location.type !== OrganizerDefaultConferencingAppType
    );

    if (!firstRealLocation) {
      // If no real locations are configured, default to Cal Video
      return {
        bookingLocation: CalVideoLocationType,
        requiresActualLink: true,
        conferenceCredentialId: null,
      };
    }

    // Process the first real location through getLocationValueForDB to handle static links properly
    const { bookingLocation, conferenceCredentialId } = BookingLocationService.getLocationDetailsFromType({
      locationType: firstRealLocation.type,
      eventTypeLocations,
    });

    return {
      bookingLocation,
      requiresActualLink: true,
      conferenceCredentialId,
    };
  }

  /**
   * Extracts location details including conferenceCredentialId from a location type or value
   *
   * @param params - The location type/value and event type locations
   * @returns The resolved booking location and conference credential ID if present
   *
   * @example
   * // Dynamic location type with credential ID
   * getLocationDetailsFromType({
   *   locationType: "integrations:zoom",
   *   eventTypeLocations: [{ type: "integrations:zoom", credentialId: 123 }]
   * })
   * // Returns: { bookingLocation: "integrations:zoom", conferenceCredentialId: 123 }
   *
   * @example
   * // Static link value (already resolved)
   * getLocationDetailsFromType({
   *   locationType: "https://zoom.us/j/123456789",
   *   eventTypeLocations: [{ type: "integrations:zoom", link: "https://zoom.us/j/123456789" }]
   * })
   * // Returns: { bookingLocation: "https://zoom.us/j/123456789", conferenceCredentialId: null }
   */
  static getLocationDetailsFromType({
    locationType,
    eventTypeLocations,
  }: GetLocationDetailsFromTypeParams): GetLocationDetailsFromTypeResult {
    const { bookingLocation, conferenceCredentialId } = getLocationValueForDB(
      locationType,
      eventTypeLocations
    );

    return { bookingLocation, conferenceCredentialId: conferenceCredentialId ?? null };
  }

  /**
   * Resolves the location for a per-host custom location in round-robin events.
   *
   * Handles different location types:
   * - Credential-based apps (Zoom, Teams, etc.) - Uses the host's stored credential
   * - Cal Video - No credential needed
   * - Static links - Returns the stored link
   * - In-person - Returns the stored address
   * - Phone locations - Returns the stored phone number or type
   * - Unknown apps - Attempts to find and link a credential, falls back to Cal Video
   */
  static async getPerHostLocation({
    hostLocation,
    allCredentials,
    eventTypeId,
    userId,
    prismaClient,
  }: GetPerHostLocationParams): Promise<GetPerHostLocationResult> {
    if (hostLocation.credentialId) {
      return {
        locationBodyString: hostLocation.type,
        organizerDefaultLocationUrl: null,
        perHostCredentialId: hostLocation.credentialId,
      };
    }

    if (hostLocation.type === CalVideoLocationType) {
      return {
        locationBodyString: hostLocation.type,
        organizerDefaultLocationUrl: null,
        perHostCredentialId: undefined,
      };
    }

    if (hostLocation.link) {
      return {
        locationBodyString: hostLocation.link,
        organizerDefaultLocationUrl: hostLocation.link,
        perHostCredentialId: undefined,
      };
    }

    if (hostLocation.type === "inPerson") {
      return {
        locationBodyString: hostLocation.address || hostLocation.type,
        organizerDefaultLocationUrl: null,
        perHostCredentialId: undefined,
      };
    }

    if (hostLocation.type === "userPhone") {
      return {
        locationBodyString: hostLocation.phoneNumber || hostLocation.type,
        organizerDefaultLocationUrl: null,
        perHostCredentialId: undefined,
      };
    }

    if (hostLocation.type === "attendeeInPerson" || hostLocation.type === "phone") {
      return {
        locationBodyString: hostLocation.type,
        organizerDefaultLocationUrl: null,
        perHostCredentialId: undefined,
      };
    }

    const appMetaForLocation = Object.values(appStoreMetadata).find(
      (app) => app.appData?.location?.type === hostLocation.type
    );

    if (appMetaForLocation) {
      const matchingCredential = allCredentials.find((cred) => cred.type === appMetaForLocation.type);

      if (matchingCredential) {
        const hostLocationRepository = new HostLocationRepository(prismaClient);
        await hostLocationRepository.linkCredential({
          userId,
          eventTypeId,
          credentialId: matchingCredential.id,
        });

        return {
          locationBodyString: hostLocation.type,
          organizerDefaultLocationUrl: null,
          perHostCredentialId: matchingCredential.id,
        };
      }
    }

    return {
      locationBodyString: CalVideoLocationType,
      organizerDefaultLocationUrl: null,
      perHostCredentialId: undefined,
    };
  }
}
