import { shouldHideBrandingForEventUsingProfile } from "@calcom/features/profile/lib/hideBranding";
import type { EventTypeRepository } from "../repositories/eventTypeRepository";

export class EventTypeService {
  constructor(private eventTypeRepository: EventTypeRepository) {}

  async shouldHideBrandingForEventType(eventTypeId: number): Promise<boolean> {
    const eventType = await this.eventTypeRepository.findByIdWithBrandingInfo({ id: eventTypeId });

    if (!eventType) return false;

    return shouldHideBrandingForEventUsingProfile({
      eventTypeId: eventType.id,
      team: eventType.team
        ? {
            hideBranding: eventType.team.hideBranding,
            parent: eventType.team.parent,
          }
        : null,
      owner: eventType.owner
        ? {
            id: eventType.owner.id,
            hideBranding: eventType.owner.hideBranding,
            profile: eventType.owner.profiles?.[0]
              ? { organization: eventType.owner.profiles[0].organization }
              : null,
          }
        : null,
    });
  }
}
