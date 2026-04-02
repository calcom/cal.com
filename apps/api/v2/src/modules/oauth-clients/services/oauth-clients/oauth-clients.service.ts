import { CreateOAuthClientInput, UpdateOAuthClientInput } from "@calcom/platform-types";
import { Injectable, NotFoundException } from "@nestjs/common";
import { OAuthClientRepository } from "../../oauth-client.repository";
import { OAuthClientsInputService } from "./oauth-clients-input.service";
import { OAuthClientsOutputService } from "./oauth-clients-output.service";

@Injectable()
export class OAuthClientsService {
  constructor(
    private readonly oauthClientRepository: OAuthClientRepository,
    private readonly oauthClientsInputService: OAuthClientsInputService,
    private readonly oauthClientsOutputService: OAuthClientsOutputService
  ) {}

  async createOAuthClient(organizationId: number, input: CreateOAuthClientInput) {
    const transformedInput = this.oauthClientsInputService.transformCreateOAuthClientInput(input);

    const { id, secret } = await this.oauthClientRepository.createOAuthClient(
      organizationId,
      transformedInput
    );

    return {
      clientId: id,
      clientSecret: secret,
    };
  }

  async getOAuthClients(organizationId: number) {
    const clients = await this.oauthClientRepository.getOrganizationOAuthClients(organizationId);
    return this.oauthClientsOutputService.transformOAuthClients(clients);
  }

  async getOAuthClientById(clientId: string) {
    const client = await this.oauthClientRepository.getOAuthClient(clientId);
    if (!client) {
      throw new NotFoundException(`OAuth client with ID ${clientId} not found`);
    }
    return this.oauthClientsOutputService.transformOAuthClient(client);
  }

  async updateOAuthClient(clientId: string, input: UpdateOAuthClientInput) {
    const client = await this.oauthClientRepository.updateOAuthClient(clientId, input);
    return this.oauthClientsOutputService.transformOAuthClient(client);
  }

  async deleteOAuthClient(clientId: string) {
    const client = await this.oauthClientRepository.deleteOAuthClient(clientId);
    return this.oauthClientsOutputService.transformOAuthClient(client);
  }
}
