import { shouldHideBrandingForEventUsingProfile } from "@calcom/features/profile/lib/hideBranding";
import type { EventTypeRepository } from "../repositories/eventTypeRepository";

/**
 * Shape of pre-fetched branding data that callers can pass to avoid a DB query.
 * Matches the raw DB shape returned by EventTypeRepository.findByIdIncludeBrandingInfo.
 */
export type EventTypeBrandingData = {
  team: {
    hideBranding: boolean | null;
    parent: { hideBranding: boolean | null } | null;
  } | null;
  owner: {
    id: number;
    hideBranding: boolean | null;
    profiles: Array<{ organization: { hideBranding: boolean | null } | null }>;
  } | null;
};

export class EventTypeService {
  constructor(private eventTypeRepository: EventTypeRepository) {}

  /**
   * Determines whether branding should be hidden for the given event type.
   *
   * - **Hot path** (prefetchedData provided): uses the supplied data directly, no DB query.
   * - **Cold path** (no prefetchedData): fetches from DB via the repository.
   */
  async shouldHideBrandingForEventType(
    eventTypeId: number,
    prefetchedData?: EventTypeBrandingData
  ): Promise<boolean> {
    const data =
      prefetchedData ?? (await this.eventTypeRepository.findByIdIncludeBrandingInfo({ id: eventTypeId }));

    if (!data) return false;

    return shouldHideBrandingForEventUsingProfile({
      eventTypeId,
      team: data.team
        ? {
            hideBranding: data.team.hideBranding,
            parent: data.team.parent,
          }
        : null,
      owner: data.owner
        ? {
            id: data.owner.id,
            hideBranding: data.owner.hideBranding,
            profile: data.owner.profiles?.[0] ? { organization: data.owner.profiles[0].organization } : null,
          }
        : null,
    });
  }
}
