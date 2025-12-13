import type { Kysely } from "kysely";

import logger from "@calcom/lib/logger";
import {
  serviceAccountKeySchema,
  type ServiceAccountKey,
  encryptServiceAccountKey,
  decryptServiceAccountKey,
} from "@calcom/lib/server/serviceAccountKey";
import type { KyselyDatabase } from "@calcom/kysely/types";

import { getOrganizationRepository } from "../../ee/organizations/di/OrganizationRepository.container";
import type {
  IDelegationCredentialRepository,
  DelegationCredentialDto,
  DelegationCredentialWithServiceAccountKeyDto,
  DelegationCredentialWithWorkspacePlatformIdDto,
  DelegationCredentialWithDelegatedMembersDto,
  DelegationCredentialCreateInput,
  DelegationCredentialUpdateInput,
} from "./IDelegationCredentialRepository";

const repositoryLogger = logger.getSubLogger({ prefix: ["KyselyDelegationCredentialRepository"] });

function doesEmailMatchDelegationCredentialDomain({
  memberEmail,
  delegationCredentialEmailDomain,
}: {
  memberEmail: string | null;
  delegationCredentialEmailDomain: string;
}) {
  if (!memberEmail) return false;
  const memberEmailDomain = memberEmail.split("@")[1];
  return memberEmailDomain === delegationCredentialEmailDomain;
}

export class KyselyDelegationCredentialRepository implements IDelegationCredentialRepository {
  constructor(
    private readonly dbRead: Kysely<KyselyDatabase>,
    private readonly dbWrite: Kysely<KyselyDatabase>
  ) {}

  private encryptServiceAccountKey(serviceAccountKey: ServiceAccountKey) {
    return encryptServiceAccountKey(serviceAccountKey);
  }

  private decryptServiceAccountKey(encryptedServiceAccountKey: unknown): ServiceAccountKey {
    return decryptServiceAccountKey(encryptedServiceAccountKey);
  }

  private withParsedServiceAccountKey<T extends { serviceAccountKey: unknown } | null>(
    delegationCredential: T
  ) {
    if (!delegationCredential) {
      return null;
    }
    const { serviceAccountKey, ...rest } = delegationCredential;

    const decryptedKey = this.decryptServiceAccountKey(serviceAccountKey);
    const parsedServiceAccountKey = serviceAccountKeySchema.safeParse(decryptedKey);

    return {
      ...rest,
      serviceAccountKey: parsedServiceAccountKey.success ? parsedServiceAccountKey.data : null,
    };
  }

  async create(data: DelegationCredentialCreateInput): Promise<DelegationCredentialDto> {
    const encryptedKey = this.encryptServiceAccountKey(data.serviceAccountKey);

    const result = await this.dbWrite
      .insertInto("DelegationCredential")
      .values({
        domain: data.domain,
        enabled: data.enabled,
        organizationId: data.organizationId,
        workspacePlatformId: data.workspacePlatformId,
        serviceAccountKey: JSON.stringify(encryptedKey),
      })
      .returning([
        "id",
        "enabled",
        "domain",
        "createdAt",
        "updatedAt",
        "organizationId",
        "lastEnabledAt",
        "lastDisabledAt",
        "workspacePlatformId",
      ])
      .executeTakeFirstOrThrow();

    const workspacePlatform = await this.dbRead
      .selectFrom("WorkspacePlatform")
      .select(["name", "slug"])
      .where("id", "=", result.workspacePlatformId)
      .executeTakeFirst();

    return {
      id: result.id,
      enabled: result.enabled,
      domain: result.domain,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      organizationId: result.organizationId,
      lastEnabledAt: result.lastEnabledAt,
      lastDisabledAt: result.lastDisabledAt,
      workspacePlatform: workspacePlatform ?? null,
    };
  }

  async findById(params: { id: string }): Promise<DelegationCredentialDto | null> {
    const result = await this.dbRead
      .selectFrom("DelegationCredential")
      .select([
        "id",
        "enabled",
        "domain",
        "createdAt",
        "updatedAt",
        "organizationId",
        "lastEnabledAt",
        "lastDisabledAt",
        "workspacePlatformId",
      ])
      .where("id", "=", params.id)
      .executeTakeFirst();

    if (!result) return null;

    const workspacePlatform = await this.dbRead
      .selectFrom("WorkspacePlatform")
      .select(["name", "slug"])
      .where("id", "=", result.workspacePlatformId)
      .executeTakeFirst();

    return {
      id: result.id,
      enabled: result.enabled,
      domain: result.domain,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      organizationId: result.organizationId,
      lastEnabledAt: result.lastEnabledAt,
      lastDisabledAt: result.lastDisabledAt,
      workspacePlatform: workspacePlatform ?? null,
    };
  }

  async findUniqueByOrganizationIdAndDomainIncludeSensitiveServiceAccountKey(params: {
    organizationId: number;
    domain: string;
  }): Promise<DelegationCredentialWithServiceAccountKeyDto | null> {
    const result = await this.dbRead
      .selectFrom("DelegationCredential")
      .select([
        "id",
        "enabled",
        "domain",
        "createdAt",
        "updatedAt",
        "organizationId",
        "lastEnabledAt",
        "lastDisabledAt",
        "workspacePlatformId",
        "serviceAccountKey",
      ])
      .where("organizationId", "=", params.organizationId)
      .where("domain", "=", params.domain)
      .executeTakeFirst();

    if (!result) return null;

    const workspacePlatform = await this.dbRead
      .selectFrom("WorkspacePlatform")
      .select(["name", "slug"])
      .where("id", "=", result.workspacePlatformId)
      .executeTakeFirst();

    const parsed = this.withParsedServiceAccountKey(result);
    if (!parsed) return null;

    return {
      ...parsed,
      workspacePlatform: workspacePlatform ?? null,
    };
  }

  async findByIdIncludeSensitiveServiceAccountKey(params: { id: string }): Promise<DelegationCredentialWithServiceAccountKeyDto | null> {
    const result = await this.dbRead
      .selectFrom("DelegationCredential")
      .select([
        "id",
        "enabled",
        "domain",
        "createdAt",
        "updatedAt",
        "organizationId",
        "lastEnabledAt",
        "lastDisabledAt",
        "workspacePlatformId",
        "serviceAccountKey",
      ])
      .where("id", "=", params.id)
      .executeTakeFirst();

    if (!result) return null;

    const workspacePlatform = await this.dbRead
      .selectFrom("WorkspacePlatform")
      .select(["name", "slug"])
      .where("id", "=", result.workspacePlatformId)
      .executeTakeFirst();

    const parsed = this.withParsedServiceAccountKey(result);
    if (!parsed) return null;

    return {
      ...parsed,
      workspacePlatform: workspacePlatform ?? null,
    };
  }

  async findUniqueByOrgMemberEmailIncludeSensitiveServiceAccountKey(params: { email: string }): Promise<DelegationCredentialWithServiceAccountKeyDto | null> {
    const log = repositoryLogger.getSubLogger({
      prefix: ["findUniqueByOrgMemberEmailIncludeSensitiveServiceAccountKey"],
    });
    log.debug("called with", { email: params.email });

    const organizationRepository = getOrganizationRepository();
    const organization = await organizationRepository.findByMemberEmail({ email: params.email });
    if (!organization) {
      log.debug("Email not found in any organization:", params.email);
      return null;
    }

    const emailDomain = params.email.split("@")[1];
    return this.findUniqueByOrganizationIdAndDomainIncludeSensitiveServiceAccountKey({
      organizationId: organization.id,
      domain: emailDomain,
    });
  }

  async findAllByDomain(params: { domain: string }): Promise<DelegationCredentialDto[]> {
    const results = await this.dbRead
      .selectFrom("DelegationCredential")
      .select([
        "id",
        "enabled",
        "domain",
        "createdAt",
        "updatedAt",
        "organizationId",
        "lastEnabledAt",
        "lastDisabledAt",
        "workspacePlatformId",
      ])
      .where("domain", "=", params.domain)
      .execute();

    const dtos: DelegationCredentialDto[] = [];
    for (const result of results) {
      const workspacePlatform = await this.dbRead
        .selectFrom("WorkspacePlatform")
        .select(["name", "slug"])
        .where("id", "=", result.workspacePlatformId)
        .executeTakeFirst();

      dtos.push({
        id: result.id,
        enabled: result.enabled,
        domain: result.domain,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        organizationId: result.organizationId,
        lastEnabledAt: result.lastEnabledAt,
        lastDisabledAt: result.lastDisabledAt,
        workspacePlatform: workspacePlatform ?? null,
      });
    }

    return dtos;
  }

  async updateById(params: { id: string; data: DelegationCredentialUpdateInput }): Promise<DelegationCredentialDto> {
    const { workspacePlatformId, organizationId, ...rest } = params.data;

    const updateData: Record<string, unknown> = { ...rest };
    if (workspacePlatformId !== undefined) {
      updateData.workspacePlatformId = workspacePlatformId;
    }
    if (organizationId !== undefined) {
      updateData.organizationId = organizationId;
    }

    const result = await this.dbWrite
      .updateTable("DelegationCredential")
      .set(updateData)
      .where("id", "=", params.id)
      .returning([
        "id",
        "enabled",
        "domain",
        "createdAt",
        "updatedAt",
        "organizationId",
        "lastEnabledAt",
        "lastDisabledAt",
        "workspacePlatformId",
      ])
      .executeTakeFirstOrThrow();

    const workspacePlatform = await this.dbRead
      .selectFrom("WorkspacePlatform")
      .select(["name", "slug"])
      .where("id", "=", result.workspacePlatformId)
      .executeTakeFirst();

    return {
      id: result.id,
      enabled: result.enabled,
      domain: result.domain,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      organizationId: result.organizationId,
      lastEnabledAt: result.lastEnabledAt,
      lastDisabledAt: result.lastDisabledAt,
      workspacePlatform: workspacePlatform ?? null,
    };
  }

  async deleteById(params: { id: string }): Promise<{ id: string }> {
    await this.dbWrite
      .deleteFrom("DelegationCredential")
      .where("id", "=", params.id)
      .execute();

    return { id: params.id };
  }

  async findByOrgIdIncludeSensitiveServiceAccountKey(params: { organizationId: number }): Promise<DelegationCredentialWithWorkspacePlatformIdDto[]> {
    const results = await this.dbRead
      .selectFrom("DelegationCredential")
      .select([
        "id",
        "enabled",
        "domain",
        "createdAt",
        "updatedAt",
        "organizationId",
        "lastEnabledAt",
        "lastDisabledAt",
        "workspacePlatformId",
        "serviceAccountKey",
      ])
      .where("organizationId", "=", params.organizationId)
      .execute();

    const dtos: DelegationCredentialWithWorkspacePlatformIdDto[] = [];
    for (const result of results) {
      const workspacePlatform = await this.dbRead
        .selectFrom("WorkspacePlatform")
        .select(["id", "name", "slug"])
        .where("id", "=", result.workspacePlatformId)
        .executeTakeFirst();

      const parsed = this.withParsedServiceAccountKey(result);
      if (parsed) {
        dtos.push({
          ...parsed,
          workspacePlatform: workspacePlatform ?? null,
        });
      }
    }

    return dtos;
  }

  async findAllEnabledIncludeDelegatedMembers(): Promise<DelegationCredentialWithDelegatedMembersDto[]> {
    const delegationCredentials = await this.dbRead
      .selectFrom("DelegationCredential")
      .selectAll()
      .where("enabled", "=", true)
      .execute();

    const results: DelegationCredentialWithDelegatedMembersDto[] = [];

    for (const dc of delegationCredentials) {
      const workspacePlatform = await this.dbRead
        .selectFrom("WorkspacePlatform")
        .select(["slug"])
        .where("id", "=", dc.workspacePlatformId)
        .executeTakeFirst();

      const organization = await this.dbRead
        .selectFrom("Team")
        .select(["id", "name", "slug"])
        .where("id", "=", dc.organizationId)
        .executeTakeFirst();

      if (!organization) continue;

      const members = await this.dbRead
        .selectFrom("Membership")
        .innerJoin("users", "users.id", "Membership.userId")
        .select([
          "Membership.id",
          "Membership.userId",
          "Membership.accepted",
          "users.id as user_id",
          "users.email as user_email",
        ])
        .where("Membership.teamId", "=", dc.organizationId)
        .where("Membership.accepted", "=", true)
        .execute();

      const delegatedMembers = members
        .filter((member) =>
          doesEmailMatchDelegationCredentialDomain({
            memberEmail: member.user_email,
            delegationCredentialEmailDomain: dc.domain,
          })
        )
        .map((member) => ({
          id: member.id,
          userId: member.userId,
          user: {
            id: member.user_id,
            email: member.user_email,
          },
          accepted: member.accepted,
        }));

      results.push({
        id: dc.id,
        enabled: dc.enabled,
        domain: dc.domain,
        createdAt: dc.createdAt,
        updatedAt: dc.updatedAt,
        organizationId: dc.organizationId,
        lastEnabledAt: dc.lastEnabledAt,
        lastDisabledAt: dc.lastDisabledAt,
        serviceAccountKey: dc.serviceAccountKey,
        workspacePlatformId: dc.workspacePlatformId,
        workspacePlatform: workspacePlatform ?? null,
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          delegatedMembers,
        },
      });
    }

    return results;
  }

  async findAllDisabledAndIncludeNextBatchOfMembersToProcess(): Promise<DelegationCredentialWithDelegatedMembersDto[]> {
    const delegationCredentials = await this.dbRead
      .selectFrom("DelegationCredential")
      .selectAll()
      .where("enabled", "=", false)
      .execute();

    const results: DelegationCredentialWithDelegatedMembersDto[] = [];

    for (const dc of delegationCredentials) {
      const workspacePlatform = await this.dbRead
        .selectFrom("WorkspacePlatform")
        .select(["slug"])
        .where("id", "=", dc.workspacePlatformId)
        .executeTakeFirst();

      const organization = await this.dbRead
        .selectFrom("Team")
        .select(["id", "name", "slug"])
        .where("id", "=", dc.organizationId)
        .executeTakeFirst();

      if (!organization) continue;

      const members = await this.dbRead
        .selectFrom("Membership")
        .innerJoin("users", "users.id", "Membership.userId")
        .select([
          "Membership.id",
          "Membership.userId",
          "Membership.accepted",
          "users.id as user_id",
          "users.email as user_email",
        ])
        .where("Membership.teamId", "=", dc.organizationId)
        .where("Membership.accepted", "=", true)
        .execute();

      const filteredMembers = members
        .filter((member) =>
          doesEmailMatchDelegationCredentialDomain({
            memberEmail: member.user_email,
            delegationCredentialEmailDomain: dc.domain,
          })
        )
        .map((member) => ({
          id: member.id,
          userId: member.userId,
          user: {
            id: member.user_id,
            email: member.user_email,
          },
          accepted: member.accepted,
        }));

      results.push({
        id: dc.id,
        enabled: dc.enabled,
        domain: dc.domain,
        createdAt: dc.createdAt,
        updatedAt: dc.updatedAt,
        organizationId: dc.organizationId,
        lastEnabledAt: dc.lastEnabledAt,
        lastDisabledAt: dc.lastDisabledAt,
        serviceAccountKey: dc.serviceAccountKey,
        workspacePlatformId: dc.workspacePlatformId,
        workspacePlatform: workspacePlatform ?? null,
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          delegatedMembers: filteredMembers,
          members: filteredMembers,
        },
      });
    }

    return results;
  }
}
