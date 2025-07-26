// config.d.ts
export interface ConfigMetadata {
  name: string;
  slug: string;
  type: string;
  logo: string;
  publisher: string;
  email: string;
  description: string;
  url?: string;
  variant?: string;
  categories?: string[];
  category?: string;
  installed?: boolean;
  isTemplate?: boolean;
  title?: string;
  dirName?: string;
  isOAuth?: boolean;
  isGlobal?: boolean;
  licenseRequired?: boolean;
  appData?: Record<string, any>;
  extendsFeature?: string;
  iconUrl?: string;
  rating?: number;
  verified?: boolean;
  premium?: boolean;
  price?: number;
  commission?: number;
  feeType?: "monthly" | "usage-based" | "one-time" | "free";
  __createdUsingCli?: boolean;
  __template?: string;
}

