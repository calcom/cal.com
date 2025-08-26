interface AppMetadataResult {
  slug: string;
  dirName: string;
  type: string | null;
  categories: string[];
  name?: string | null;
  description?: string | null;
  logo?: string | null;
  enabled: boolean;
  extendsFeature?: string | null;
  dependencies?: string[];
}

export interface AppRepositoryInterface {
  getMetadataFromSlug(slug: string): Promise<AppMetadataResult | null>;
  getAllEnabledApps(): Promise<AppMetadataResult[]>;
  getAllEnabledAppsWithCredentials({
    userId,
    teamIds,
  }: {
    userId: number;
    teamIds?: number[];
  }): Promise<AppMetadataResult[]>;
}
