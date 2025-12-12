/**
 * ORM-agnostic interface for OAuthClientRepository
 * This interface defines the contract for OAuth client data access
 * Implementations can use Prisma, Kysely, or any other data access layer
 */

export interface OAuthClientDto {
  redirectUri: string | null;
  clientSecret: string;
  clientType: string | null;
}

export interface IOAuthClientRepository {
  findByClientId(clientId: string): Promise<OAuthClientDto | null>;
}
