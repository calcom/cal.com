import type { FeatureId } from "./config";

export class FeaturesCacheKeys {
  private static readonly PREFIX = "features";

  static cacheBuster(): string {
    return `${this.PREFIX}:cacheBuster`;
  }

  static globalFeature(cacheBuster: string, slug: FeatureId): string {
    return `${this.PREFIX}:${cacheBuster}:globalFeature:${slug}`;
  }

  static userFeature(cacheBuster: string, userId: number, slug: string): string {
    return `${this.PREFIX}:${cacheBuster}:userFeature:${userId}:${slug}`;
  }

  static userFeatureNonHierarchical(cacheBuster: string, userId: number, slug: string): string {
    return `${this.PREFIX}:${cacheBuster}:userFeatureNH:${userId}:${slug}`;
  }

  static teamFeature(cacheBuster: string, teamId: number, slug: FeatureId): string {
    return `${this.PREFIX}:${cacheBuster}:teamFeature:${teamId}:${slug}`;
  }

  static teamsWithFeatureEnabled(cacheBuster: string, slug: FeatureId): string {
    return `${this.PREFIX}:${cacheBuster}:teamsWithFeature:${slug}`;
  }

  static userFeatureStates(cacheBuster: string, userId: number, featureIds: FeatureId[]): string {
    const sortedFeatureIds = [...featureIds].sort().join(",");
    return `${this.PREFIX}:${cacheBuster}:userFeatureStates:${userId}:${sortedFeatureIds}`;
  }

  static teamsFeatureStates(cacheBuster: string, teamIds: number[], featureIds: FeatureId[]): string {
    const sortedTeamIds = [...teamIds].sort((a, b) => a - b).join(",");
    const sortedFeatureIds = [...featureIds].sort().join(",");
    return `${this.PREFIX}:${cacheBuster}:teamsFeatureStates:${sortedTeamIds}:${sortedFeatureIds}`;
  }

  static userAutoOptIn(cacheBuster: string, userId: number): string {
    return `${this.PREFIX}:${cacheBuster}:userAutoOptIn:${userId}`;
  }

  static teamsAutoOptIn(cacheBuster: string, teamIds: number[]): string {
    const sortedTeamIds = [...teamIds].sort((a, b) => a - b).join(",");
    return `${this.PREFIX}:${cacheBuster}:teamsAutoOptIn:${sortedTeamIds}`;
  }

  static generateCacheBuster(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
