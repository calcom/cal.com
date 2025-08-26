export interface AppRepositoryInterface {
  getMetadataFromSlug(slug: string): Promise<{
    slug: string;
    dirName: string;
    type: string | null;
    categories: string[];
    name?: string | null;
    description?: string | null;
    logo?: string | null;
    enabled: boolean;
    extendsFeature?: string | null;
  } | null>;
}
