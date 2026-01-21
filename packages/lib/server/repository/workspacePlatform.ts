import { prisma } from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";
import type { TServiceAccountKeySchema } from "@calcom/prisma/zod-utils";
import { serviceAccountKeySchema } from "@calcom/prisma/zod-utils";

type WorkspacePlatformServiceAccountKey = TServiceAccountKeySchema | null;
const safeWorkspacePlatformSelect = {
  id: true,
  name: true,
  enabled: true,
  slug: true,
  description: true,
};

const workspacePlatformSelectWithServiceAccountKey = {
  ...safeWorkspacePlatformSelect,
  defaultServiceAccountKey: true,
};

export class WorkspacePlatformRepository {
  private static withParsedServiceAccountKey<T extends { defaultServiceAccountKey: Prisma.JsonValue }>(
    data: T
  ) {
    return {
      ...data,
      defaultServiceAccountKey: serviceAccountKeySchema.parse(data.defaultServiceAccountKey),
    };
  }

  static async create(data: {
    slug: string;
    name: string;
    description: string;
    defaultServiceAccountKey?: WorkspacePlatformServiceAccountKey;
    enabled: boolean;
  }) {
    const { defaultServiceAccountKey: _defaultServiceAccountKey, ...rest } = data;
    const defaultServiceAccountKey =
      _defaultServiceAccountKey === undefined || _defaultServiceAccountKey === null
        ? Prisma.JsonNull
        : _defaultServiceAccountKey;
    return await prisma.workspacePlatform.create({
      data: {
        defaultServiceAccountKey: defaultServiceAccountKey as unknown as Prisma.InputJsonValue,
        ...rest,
      },
      select: safeWorkspacePlatformSelect,
    });
  }

  static async findAll() {
    return await prisma.workspacePlatform.findMany({
      select: safeWorkspacePlatformSelect,
    });
  }

  static async findAllBySlug({ slug }: { slug: string }) {
    return await prisma.workspacePlatform.findMany({
      where: { slug },
      select: safeWorkspacePlatformSelect,
    });
  }

  static async findBySlug({ slug }: { slug: string }) {
    return await prisma.workspacePlatform.findUnique({
      where: { slug },
      select: safeWorkspacePlatformSelect,
    });
  }

  static async findBySlugIncludeSensitiveServiceAccountKey({ slug }: { slug: string }) {
    const workspacePlatform = await prisma.workspacePlatform.findUnique({
      where: { slug },
      select: workspacePlatformSelectWithServiceAccountKey,
    });
    if (!workspacePlatform) {
      return null;
    }
    return WorkspacePlatformRepository.withParsedServiceAccountKey(workspacePlatform);
  }

  static async updateById({
    id,
    data,
  }: {
    id: number;
    data: Partial<{
      slug: string;
      name: string;
      description: string;
      defaultServiceAccountKey: TServiceAccountKeySchema;
      enabled: boolean;
    }>;
  }) {
    return await prisma.workspacePlatform.update({
      where: { id },
      data: {
        ...data,
        defaultServiceAccountKey: data.defaultServiceAccountKey as unknown as Prisma.InputJsonValue,
      },
      select: safeWorkspacePlatformSelect,
    });
  }
}
