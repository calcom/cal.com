import type { FeatureId } from "./config";

export interface VersionStamps {
  global: string;
  access: string;
  user?: string;
  team?: string;
}

const DEFAULT_VERSION = "0";

export class FeaturesCacheKeys {
  private static readonly PREFIX = "features";

  static versionGlobal(): string {
    return `${this.PREFIX}:v:global`;
  }

  static versionAccess(): string {
    return `${this.PREFIX}:v:access`;
  }

  static versionUser(userId: number): string {
    return `${this.PREFIX}:v:user:${userId}`;
  }

  static versionTeam(teamId: number): string {
    return `${this.PREFIX}:v:team:${teamId}`;
  }

  static globalFeature(versions: Pick<VersionStamps, "global">, slug: FeatureId): string {
    return `${this.PREFIX}:globalFeature:vG=${versions.global}:${slug}`;
  }

  static userFeature(
    versions: Pick<VersionStamps, "global" | "access" | "user">,
    userId: number,
    slug: string
  ): string {
    return `${this.PREFIX}:userFeature:vG=${versions.global}:vA=${versions.access}:vU=${versions.user ?? DEFAULT_VERSION}:${userId}:${slug}`;
  }

  static userFeatureNonHierarchical(
    versions: Pick<VersionStamps, "global" | "user">,
    userId: number,
    slug: string
  ): string {
    return `${this.PREFIX}:userFeatureNH:vG=${versions.global}:vU=${versions.user ?? DEFAULT_VERSION}:${userId}:${slug}`;
  }

  static teamFeature(
    versions: Pick<VersionStamps, "global" | "access" | "team">,
    teamId: number,
    slug: FeatureId
  ): string {
    return `${this.PREFIX}:teamFeature:vG=${versions.global}:vA=${versions.access}:vT=${versions.team ?? DEFAULT_VERSION}:${teamId}:${slug}`;
  }

  static teamsWithFeatureEnabled(versions: Pick<VersionStamps, "global" | "access">, slug: FeatureId): string {
    return `${this.PREFIX}:teamsWithFeature:vG=${versions.global}:vA=${versions.access}:${slug}`;
  }

  static userFeatureStates(
    versions: Pick<VersionStamps, "global" | "access" | "user">,
    userId: number,
    featureIds: FeatureId[]
  ): string {
    const sortedFeatureIds = [...featureIds].sort().join(",");
    return `${this.PREFIX}:userFeatureStates:vG=${versions.global}:vA=${versions.access}:vU=${versions.user ?? DEFAULT_VERSION}:${userId}:${sortedFeatureIds}`;
  }

  static teamsFeatureStates(
    versions: Pick<VersionStamps, "global" | "access">,
    teamIds: number[],
    featureIds: FeatureId[]
  ): string {
    const sortedTeamIds = [...teamIds].sort((a, b) => a - b).join(",");
    const sortedFeatureIds = [...featureIds].sort().join(",");
    return `${this.PREFIX}:teamsFeatureStates:vG=${versions.global}:vA=${versions.access}:${sortedTeamIds}:${sortedFeatureIds}`;
  }

  static userAutoOptIn(versions: Pick<VersionStamps, "user">, userId: number): string {
    return `${this.PREFIX}:userAutoOptIn:vU=${versions.user ?? DEFAULT_VERSION}:${userId}`;
  }

  static teamsAutoOptIn(teamIds: number[]): string {
    const sortedTeamIds = [...teamIds].sort((a, b) => a - b).join(",");
    return `${this.PREFIX}:teamsAutoOptIn:${sortedTeamIds}`;
  }

  static generateVersionStamp(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
