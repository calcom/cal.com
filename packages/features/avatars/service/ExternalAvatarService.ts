import { AvatarApiClient } from "../AvatarApiClient";
import type { ExternalAvatarRepository } from "../repository/ExternalAvatarRepository";

interface ExternalAvatarServiceDeps {
  externalAvatarRepository: ExternalAvatarRepository;
}

export class ExternalAvatarService {
  private readonly externalAvatarRepository: ExternalAvatarRepository;

  constructor(deps: ExternalAvatarServiceDeps) {
    this.externalAvatarRepository = deps.externalAvatarRepository;
  }

  async getImageUrl(email: string): Promise<string | null> {
    const cached = await this.externalAvatarRepository.findByEmail(email);
    if (cached) {
      return cached.imageUrl;
    }

    const client = AvatarApiClient.fromEnv();
    if (!client) {
      return null;
    }

    const imageUrl = await client.getImageUrl(email);
    await this.externalAvatarRepository.upsert(email, imageUrl);
    return imageUrl;
  }
}
